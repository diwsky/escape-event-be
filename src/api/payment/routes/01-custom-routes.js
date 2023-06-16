"use strict";

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/payments/invoice",
      handler: "payment.createInvoice",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/payments/mt/invoice",
      handler: "payment.createMtInvoice",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/payments/receive-payment",
      handler: "payment.receivePayment",
      config: {
        policies: [],
      },
    },
  ],
};
