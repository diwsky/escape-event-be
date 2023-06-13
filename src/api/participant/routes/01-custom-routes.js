"use strict";

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/participants/send_registration_mail",
      handler: "participant.sendRegistrationMail",
      config: {
        policies: [],
      },
    },
  ],
};
