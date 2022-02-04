# backend.sql + frontend.js = ❤️❤️❤️

This is an example app built with PostgREST to show a new way to ship open-source apps for self-hosting. [This article](https://blog.polyglot.network/backend.sql-+-frontend.js-love) explains the motivation and a step-by-step explanation, but in short, we define the schema, postgREST can serve both the initial HTML page as well as a full-fledged and secure REST api. The HTML page then loads the via Javascript from CDN which makes use of the REST api. In essence, there is only [backend.sql] and [frontend.js] to worry about. The user runs `backend.sql` on her database, and the developers maintain `frontend.js` on a CDN.

- Run the `backend.sql` on your postgresql database: `psql < backend.sql`
- Start PostgREST with these parameters:

```
PGRST_RAW_MEDIA_TYPES=text/html PGRST_DB_URI=postgres://postgrest:mysecretpassword@localhost:5432/dbname PGRST_DB_ANON_ROLE=web_anon PGRST_DB_SCHEMAS=todo PGRST_JWT_SECRET=your-256-bit-secret-your-256-bit-secret PGRST_LOG_LEVEL=info postgrest

```

![screenshot](https://2285905252-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FCUR9BVfcFBOQFL62VyFA%2Fuploads%2FFctrW1OyJA27PjO5meoh%2Fimage.png?alt=media&token=54e1653a-9a51-4220-9ff6-b1469290d30f)

- Your ToDo app is now ready at http://localhost:3000/rpc/homepage
- Anonymous users will be able to see two existing tasks, but they won't be able to create/update/delete
- If you used the same secret and role name as given, you can use this token to login as a user: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoidG9kb191c2VyIn0.xXy_2x-iYau-SKFi_XTulaRvfQ6MXx9P5M-AqxOKbs8`
- After logging in, user can create/update/delete their own tasks, but not anybody else's - even if they attempt direct API calls
- For real-world usage, you will also need nginx/caddy in front of postgrest to handle domain name, SSL certificate etc.
- Also, see [how to harden the security for postgREST](https://postgrest.org/en/stable/admin.html)

### Debug

Test the API:

Anonymous users can read the todos:
`curl http://localhost:3000/tasks`

But they shouldn't be able to insert todos:
`curl http://localhost:3000/tasks -X POST -H "Content-Type: application/json" -d '{"name": "do bad thing"}'`

Logged-in users need a JWT token, preferably expirable. So, first decide the expiry duration and get the timestamp:

`select extract(epoch from now() + '5 minutes'::interval) :: integer`

And then use `{"role": "todo_user", "exp": timestamp}` as the payload to generate the JWT. You can [do it manually on jwt.io](https://jwt.io/)

With the JWT, inserts should work:

```
curl http://localhost:3000/tasks -X POST \
     -H "Authorization: Bearer $TOKEN"   \
     -H "Content-Type: application/json" \
     -d '{"name": "learn how to auth"}'
```

Or updates:
```
curl http://localhost:3000/tasks -X PATCH \
     -H "Authorization: Bearer $TOKEN"    \
     -H "Content-Type: application/json"  \
     -d '{"done": true}'
```

To allow a new user to manage their own todos, just run the following on your postgres:

```
create role second_user nologin;
grant usage on schema todo to second_user;
grant second_user to postgrest;
grant all on todo.tasks to second_user;
grant usage, select on sequence todo.tasks_id_seq to second_user;
```

And then generate a valid JWT token for them as explained above. They can enter this in the app UI and login.
