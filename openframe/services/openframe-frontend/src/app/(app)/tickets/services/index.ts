import { TicketService } from './ticket-service';

export const ticketService = new TicketService();

export type {
  BoardStatus,
  FetchMessagesParams,
  FetchTicketsParams,
  MessagePage,
  TicketsPage,
} from './ticket-service.types';
