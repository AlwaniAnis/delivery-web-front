import CustomerModel from "./CustomerModel";

export default class DeliveryModel {
  remark = "";
  beginProcessDate = new Date();
  deliveryDate = null;
  refundDate = null;
  waitToReturnToSenderDate = null;
  operationalStatus = 1;
  status = 1;
  result = 0;
  cost = 0;
  totalPrice = 0;
  designation = "";
  code = "";
  address = "";
  phoneNumber = "";
  coliItems = [];
  customer = new CustomerModel();
  customerId = 0;
  isPaid = false;
  datePayment = null;
  driverId = null;
  pickupDriverId = null;
  pickupDriver = null;
  deliveryDriverId = null;
  deliveryDriver = null;
  qrCodeContent = "";
  exchangeable = false;
  eStoreId = null;
  tarifId = null;
  tarifDelivery = 0;
  pickupPrice = 0;
  commissionDriver = 0;
  commissionReturn = 0;
  isPickedUp = false;
  isAtDepot = false;
  atDepotConfirmedBy = null;
  atDepotConfirmedDate = null;
  deliveredDate = null;
  preparationPlaceId = 1;
  isRefunded = false;
  refundAmount = 0;
  refundCause = 0;
  refundCauseDescription = "";
  isSettled = false;
  logs = "";
  deliveryAttemptCount = 0;
}

export class ColiItem {
  brittle = false;
  qty = 1;
  unitPrice = 0;
  designation = "";
  deliveryId = 0;
  weight = 0;
}
