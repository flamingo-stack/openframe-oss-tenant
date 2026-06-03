import { TicketService } from './ticket-service';

export const ticketService = new TicketService();

export type {
  BoardStatus,
  FetchMessagesParams,
  FetchTicketsBoardParams,
  FetchTicketsParams,
  MessagePage,
  TicketsBoardPage,
  TicketsPage,
} from './ticket-service.types';
