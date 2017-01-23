// This is the js for the default/index.html view.

function replaceQueryParam(param, newval, search) {
    var regex = new RegExp("([?;&])" + param + "[^&;]*[;&]?");
    var query = search.replace(regex, "$1").replace(/&$/, '');

    return (query.length > 2 ? query + "&" : "?") + (newval ? param + "=" + newval : '');
}

function setQueryParam(param, newval) {
    var str = window.location.search;
    str = replaceQueryParam(param, newval, str);

    history.pushState({}, null, window.location.pathname + str);
}

var app = function() {

    var self = {};

    Vue.config.silent = false; // show all warnings

    // Extends an array
    self.extend = function(a, b) {
        for (var i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
    };

    // Enumerates an array.
    var enumerate = function(v) {
        var k=0;
        return v.map(function(e) {e._idx = k++;});
    };

    function create_get_posts_url(start_idx, end_idx) {

        var pp = {
            start_idx: start_idx,
            end_idx: end_idx,
            category: self.vue.category
        };
        if (get_posts_url.indexOf("?") !== -1) {
            return get_posts_url + "&" + $.param(pp);
        }
        else {
            return get_posts_url + "?" + $.param(pp);
        }
    }

    self.get_posts = function () {
        $.getJSON(create_get_posts_url(0, 4), function (data) {
            self.vue.posts = data.posts;
            self.vue.has_more = data.has_more;
            self.vue.logged_in = data.logged_in;
            enumerate(self.vue.posts);

            for(var i = 0; i < self.vue.posts.length; i++) {
                var post = self.vue.posts[i];
                enumerate(post["comments"]);
                console.log(post);
            }
        })
    };

    self.get_more_posts = function () {
        var num_posts = self.vue.posts.length;
        $.getJSON(create_get_posts_url(num_posts, num_posts + 4), function (data) {
            self.vue.has_more = data.has_more;
            self.extend(self.vue.posts, data.posts);
            enumerate(self.vue.posts);

            for(var i = 0; i < self.vue.posts.length; i++) {
                var post = self.vue.posts[i];
                enumerate(post["comments"]);
            }
        });
    };

    self.show_activities = function () {
        self.vue.category = 0;
        self.get_posts();

        //Change the url in the browser
         //setQueryParam("category", 0);
    }

    self.show_education = function () {
        self.vue.category = 1;
        self.get_posts();

        //Change the url in the browser
         //setQueryParam("category", 1);
    }

    self.show_buy_sell = function () {
        self.vue.category = 2;
        self.get_posts();

        //Change the url in the browser
         //setQueryParam("category", 2);
    }
    /* POST CREATION */

    self.add_post_button = function () {
        // The button to add a post has been pressed.
        self.vue.is_adding_post = !self.vue.is_adding_post;

        self.vue.form_post_content = "";
    };

    self.add_post = function () {

        $.post(add_post_url,
            {
                category: self.vue.category,
                post_content: self.vue.form_post_content,
                file: self.vue.form_post_file
            },
            function (data) {
                $.web2py.enableElement($("#add_post_submit"));

                self.vue.form_post_content = "";
                self.vue.form_post_file = null;

                self.vue.is_adding_post = false;

                self.vue.posts.unshift(data.post);
                enumerate(self.vue.posts);
            });
    };

    self.on_file_change = function(e) {
      var files = e.target.files || e.dataTransfer.files;
      if (!files.length)
        return;

      var file = files[0];
      var image = new Image();

      var reader = new FileReader();
      var vm = self;

      reader.onload = (e) => {
        vm.vue.form_post_file = e.target.result;
      };
      reader.readAsDataURL(file);

    }

    self.delete_post = function (post_idx) {
        $.post(del_post_url,
            { post_id: self.vue.posts[post_idx].id },
            function () {
                self.vue.posts.splice(post_idx, 1);
                enumerate(self.vue.posts);
            }
        )
    };

    /* POST EDITING */

    self.begin_edit_post = function (post_idx) {
        self.vue.editing_post_idx = post_idx;

        self.vue.form_edit_post_content = self.vue.posts[post_idx].post_content;
    };

    self.end_edit_post = function () {
        var post_idx = self.vue.editing_post_idx;

        $.post(edit_post_url,
            {
                post_content: self.vue.form_edit_post_content,
                post_id: self.vue.posts[post_idx]["id"]
            },
            function (data) {
                self.vue.posts[post_idx] = data.post;
                enumerate(self.vue.posts);

                self.vue.editing_post_idx = -1;
            });
    };

    self.cancel_edit_post = function () {
        self.vue.editing_post_idx = -1;
    };

    /*COMMENTS*/

    self.begin_add_comment = function (post_idx) {
        self.vue.comment_post_idx = post_idx;

        self.vue.form_comment_content = "";
    };

    self.end_add_comment = function () {
        var post_idx = self.vue.comment_post_idx;

        $.post(add_comment_url,
            {
                comment_content: self.vue.form_comment_content,
                post_id: self.vue.posts[post_idx]["id"]
            },
            function (data) {
                self.vue.posts[post_idx]["comments"].push(data.comment);

                enumerate(self.vue.posts[post_idx]["comments"]);

                self.vue.comment_post_idx = -1;
            });
    };

    self.cancel_add_comment = function () {
        self.vue.comment_post_idx = -1;
    };

    self.delete_comment = function (post_idx, comment_idx) {
        console.log(comment_idx);
        $.post(del_comment_url,
            { comment_id: self.vue.posts[post_idx]["comments"][comment_idx].id},
            function () {
                self.vue.posts[post_idx]["comments"].splice(comment_idx, 1);
                enumerate(self.vue.posts[post_idx]["comments"]);
            }
        )
    };
    // Complete as needed.
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            is_adding_post: false,
            posts: [],
            logged_in: false,
            has_more: false,
            form_post_content: null,
            form_post_file: null,
            editing_post_idx: -1,
            form_edit_post_content: null,
            comment_post_idx: -1,
            form_comment_content: null,
            category: 0
        },
        methods: {
            get_more_posts: self.get_more_posts,
            add_post_button: self.add_post_button,
            add_post: self.add_post,
            delete_post: self.delete_post,
            begin_edit_post: self.begin_edit_post,
            end_edit_post: self.end_edit_post,
            cancel_edit_post: self.cancel_edit_post,
            begin_add_comment: self.begin_add_comment,
            end_add_comment: self.end_add_comment,
            cancel_add_comment: self.cancel_add_comment,
            delete_comment: self.delete_comment,
            show_activites: self.show_activities,
            show_education: self.show_education,
            show_buy_sell: self.show_buy_sell,
            on_file_change: self.on_file_change
        }
    });

        // Complete as needed.
    self.buttonVue = new Vue({
        el: "#button-vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {

        },
        methods: {
            show_activites: self.show_activities,
            show_education: self.show_education,
            show_buy_sell: self.show_buy_sell
        }
    });

    $("#vue-div").show();
    $("#button-vue-div").show();
    return self;
};

var APP = app();

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
//jQuery(function(){APP = app();});
