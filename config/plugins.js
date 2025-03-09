module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: "@strapi-community/strapi-provider-upload-google-cloud-storage",
      providerOptions: {
        serviceAccount: env.json("GCS_SERVICE_ACCOUNT"),
        bucketName: env("GCS_BUCKET_NAME"),
        basePath: env("GCS_BASE_PATH"),
        baseUrl: env("GCS_BASE_URL"),
        publicFiles: env("GCS_PUBLIC_FILES"),
        uniform: env("GCS_UNIFORM"),
      },
      // provider: "aws-s3",
      // providerOptions: {
      //   accessKeyId: env("AWS_ACCESS_KEY_ID"),
      //   secretAccessKey: env("AWS_ACCESS_SECRET"),
      //   region: env("AWS_REGION"),
      //   params: {
      //     Bucket: env("AWS_BUCKET_NAME"),
      //   },
      // },
      // These parameters could solve issues with ACL public-read access — see [this issue](https://github.com/strapi/strapi/issues/5868) for details
      actionOptions: {
        upload: {
          // ACL: "private",
          ACL: null,
        },
        uploadStream: {
          //ACL: "private",
          ACL: null,
        },
        delete: {},
      },
    },
  },
  email: {
    config: {
      provider: "nodemailer",
      providerOptions: {
        host: env("SMTP_HOST", "smtp.example.com"),
        port: env("SMTP_PORT", 587),
        secure: false,
        auth: {
          user: env("SMTP_USERNAME"),
          pass: env("SMTP_PASSWORD"),
        },
      },
      settings: {
        defaultFrom: "escapenice.event@gmail.com",
        defaultReplyTo: "escapenice.event@gmail.com",
      },
    },
  },
});
