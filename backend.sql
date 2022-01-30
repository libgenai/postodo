drop schema if exists todo cascade;
drop role if exists postgrest; 
drop role if exists web_anon; 
drop role if exists todo_user;

-- this is for postgrest to connect to postgresql
create role postgrest noinherit login password 'mysecretpassword';

-- this schema will hold all our tables, views, functions etc
create schema todo;

-- role for anonymous visitors
create role web_anon nologin;
grant usage on schema todo to web_anon;
grant web_anon to postgrest;

-- role for users who can login and create/delete their own data
create role todo_user nologin;
grant usage on schema todo to todo_user;
grant todo_user to postgrest;

-- Hide all new functions from public
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- for a todo list app, we need a tasks table
create table todo.tasks (
  id serial primary key,
  done boolean not null default false,
  name text not null,
  owner name not null default current_user
);

-- Now we will enable row-level security, using two policies
-- because both the two policies are permissive, they will be combined using the OR operator

ALTER TABLE todo.tasks ENABLE ROW LEVEL SECURITY;

grant select on todo.tasks to web_anon;
grant all on todo.tasks to todo_user;
grant usage, select on sequence todo.tasks_id_seq to todo_user;

-- Allow non-anon users to read/modify only their own tasks
CREATE POLICY own_tasks_only ON todo.tasks
    AS PERMISSIVE
    FOR ALL
    USING (owner = current_user) -- visibility of existing rows
    WITH CHECK (owner = current_user); -- only create/update own tasks

-- Allow anon users to read all tasks
CREATE POLICY allow_anon_read ON todo.tasks
    AS PERMISSIVE
    FOR SELECT TO web_anon
    USING (1 = 1);


-- Let's create a few sample tasks
insert into todo.tasks (name) values
  ('finish tutorial 0'), ('pat self on back');

-- To register a user (i.e. to allow new users to login from the public webpage)
-- You'd have to create a new role, and grant same permissions as we did to todo_user
-- then generate a JWT token for them like this:

-- get timestamp: select extract(epoch from now() + '5 minutes'::interval) :: integer
-- payload json: {"role": "new_role_name", "exp": timestamp}
-- generate jwt using a tool like github.com/nileshtrivedi/devtoolbox



-- This function will response to GET requests on /rpc/homepage
-- change the value of postgrest_url as per your setup: https, domain, port etc

CREATE OR REPLACE FUNCTION todo.homepage() RETURNS varchar AS $$
BEGIN
  PERFORM set_config('response.headers','[{"Content-Type": "text/html"}]', true);
  RETURN '<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://unpkg.com/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  </head>
  <body class="bg-blue-50">
    <script>
        window.postgrest_url = "http://localhost:3000/tasks";
        window.postgrest_token = localStorage.getItem("postgrest_token");
    </script>
    <script type="module" src="https://cdn.jsdelivr.net/gh/polyglotnetwork/postodo@0.1.0/frontend.js" 
      integrity="sha384-t46M0SgRKdyr+MlA2L+u8UFnVg5/UUWGcVc5iiWn+UVJhSXN+Tgnyv9Pmwinu8ZW" crossorigin="anonymous">
    </script>
  </body>
</html>';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

GRANT EXECUTE ON FUNCTION todo.homepage TO web_anon;