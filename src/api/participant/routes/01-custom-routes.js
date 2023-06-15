"use strict";

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/participants/send-registration-mail",
      handler: "participant.sendRegistrationMail",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/participants/bib",
      handler: "participant.getBibNumber",
      config: {
        policies: [],
      },
    },
  ],
};
