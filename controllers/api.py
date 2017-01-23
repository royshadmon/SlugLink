# These are the controllers for your ajax api.
import os
import shutil

def get_user_name_from_email(email):
    """Returns a string corresponding to the user first and last names,
    given the user email."""
    u = db(db.auth_user.email == email).select().first()
    if u is None:
        return 'None'
    else:
        return ' '.join([u.first_name, u.last_name])

def get_posts():
    start_idx = int(request.vars.start_idx) if request.vars.start_idx is not None else 0
    end_idx = int(request.vars.end_idx) if request.vars.end_idx is not None else 0

    has_more = False
    rows = db(db.post.category == request.vars.category).select(
                       orderby=~db.post.created_on,
                       limitby=(start_idx, end_idx + 1))
    posts = []

    for i, r in enumerate(rows):
        if i < end_idx - start_idx:
            posts.append(process_post(r))
        else:
            has_more = True

    logged_in = auth.user_id is not None

    return response.json(dict(
        vars=request.vars,
        posts=posts,
        logged_in=logged_in,
        has_more=has_more
    ))

def process_post(r):
    if r.updated_on != r.created_on:
        timestamp_display = r.created_on.strftime("%b, %d %Y at %I:%M %p") + " edited " + r.updated_on.strftime("%b, %d %Y at %I:%M %p");
    else:
        timestamp_display = r.created_on.strftime("%b, %d %Y at %I:%M %p");

    is_owner = auth.user_id and auth.user.email == r.user_email

    rows = db(db.comments.post_id == r.id).select(orderby=db.comments.created_on)

    comments = []

    for comment in rows:
        comments.append(process_comment(comment))

    file = None

    if r.has_file:
        file = retrieve_file(str(r.id))
    else:
        file = None

    t = dict(
        id=r.id,
        name=get_user_name_from_email(r.user_email),
        email=r.user_email,
        post_content=r.post_content,
        created_on=r.created_on,
        timestamp_display=timestamp_display,
        is_owner=is_owner,
        comments=comments,
        file=file,
        has_file=r.has_file
    )

    return t

def process_comment(c):
    timestamp_display = c.created_on.strftime("%b, %d %Y at %I:%M %p");

    is_owner = auth.user_id and auth.user.email == c.user_email

    t = dict(
        id=c.id,
        name=get_user_name_from_email(c.user_email),
        email=c.user_email,
        comment_content=c.comment_content,
        created_on=c.created_on,
        timestamp_display=timestamp_display,
        is_owner=is_owner
    )

    return t

# Note that we need the URL to be signed, as this changes the db.
@auth.requires_signature()
def add_post():
    p_id = db.post.insert(
        post_content = request.vars.post_content,
        category = request.vars.category,
        has_file = True if (request.vars.file) else False
    )

    store_file(request.vars.file, str(p_id))

    post = process_post(db.post(p_id))

    return response.json(dict(post=post))

def store_file(filecontents, filename):
    file = open('applications/sluglink/uploads/' + filename, 'w')
    file.write(filecontents)
    file.close()

def retrieve_file(filename):
    file = open('applications/sluglink/uploads/' + filename, 'r')
    return file.read()

@auth.requires_signature()
def del_post():
    db(db.post.id == request.vars.post_id).delete()
    return "ok"

@auth.requires_signature()
def del_comment():
    db(db.comments.id == request.vars.comment_id).delete()
    return "ok"

@auth.requires_signature()
def edit_post():
    row = db(db.post.id == request.vars.post_id).select().first()
    row.update_record(post_content = request.vars.post_content)

    post = process_post(db.post(request.vars.post_id))

    return response.json(dict(post=post))

@auth.requires_login()
def add_comment():
    c_id = db.comments.insert(
        post_id=request.vars.post_id,
        comment_content=request.vars.comment_content
    )
    return response.json(dict(comment=process_comment(db.comments(c_id))))