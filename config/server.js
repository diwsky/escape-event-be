module.exports = ({ env }) => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  url: env("PUBLIC_URL", "https://api.escape-nice.id"),
  app: {
    keys: env.array("APP_KEYS"),
  },
  webhooks: {
    populateRelations: env.bool("WEBHOOKS_POPULATE_RELATIONS", false),
  },
  admin: {
    auth: {
      secret: env("ADMIN_JWT_SECRET","loRRmVgC76wDsFWwBbXCuQ=="),
    },
    //path: '/admin',
    //build: {
    //  backend: env('ADMIN_BUILD_BACKEND', 'http://3.0.151.16:1337/'),
    //},
  },
});
