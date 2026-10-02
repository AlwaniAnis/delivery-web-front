export default class DriverPaymentModel {
  id = 0;
  driverId = null;
  amount = 0;
  date = new Date().toISOString().split("T")[0];
  comment = "";
  deliveryId = null;
}
