import CustomerModel from "./CustomerModel";

export default class DeliveryModel {
  remark;
  beginProcessDate = new Date();
  endDate = new Date();
  status = 1;
  cost = 0;
  totalPrice = 0;
  designation = "";
  address = "";
  phoneNumber = "";
  coliItems = [
    //   {
    //     "id": 0,
    //     "createdDate"new Date()
    //     "createdBy"
    //     "updatedDate"new Date()
    //     "updatedBy"
    //     "qty": 0,
    //     "unitPrice": 0,
    //     "designation"
    //     "deliveryId": 0
    //   }
  ];
  qrCodeContent = "";
  customer = new CustomerModel();
  driverId = null;
  preparationPlaceId = null;
  tarifId = null;
  tarifDelivery = 0;
  commissionDriver = 0;
}
export class ColiItem {
  qty = 0;
  unitPrice = 0;
  designation = "";
  preparationPlaceId = null;
}
