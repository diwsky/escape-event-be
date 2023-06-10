"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/payments/get_invoice",
      handler: "payment.getInvoice",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/payments/create_invoice",
      handler: "payment.createInvoice",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/payments/receive_payment",
      handler: "payment.receivePayment",
      config: {
        policies: [],
      },
    },
  ],
};
