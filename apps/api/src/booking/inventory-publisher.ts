import type {
  InventoryEventName,
  InventoryUpdate,
  OrderStatus,
  CheckInUpdate,
} from '@tixflow/shared';
export abstract class InventoryPublisher {
  checkinChanged(_update: CheckInUpdate): void {
    void _update;
  }
  revokeStaff(_userId: string, _eventId: string): void {
    void _userId;
    void _eventId;
  }
  disconnectUser(_userId: string): void {
    void _userId;
  }
  abstract publish(name: InventoryEventName, update: InventoryUpdate): void;
  abstract orderChanged(
    userId: string,
    input: { orderId: string; eventId: string; status: OrderStatus },
  ): void;
}
