import type { InventoryEventName, InventoryUpdate, OrderStatus } from '@tixflow/shared';
export abstract class InventoryPublisher {
  abstract publish(name: InventoryEventName, update: InventoryUpdate): void;
  abstract orderChanged(
    userId: string,
    input: { orderId: string; eventId: string; status: OrderStatus },
  ): void;
}
