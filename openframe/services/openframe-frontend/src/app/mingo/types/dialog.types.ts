// GraphQL response types
export interface DialogNode {
  id: string;
  title: string;
  status: string;
  owner?: {
    machineId?: string;
    machine?: {
      id: string;
      machineId: string;
      hostname: string;
      organizationId: string;
    };
  };
  createdAt: string;
  statusUpdatedAt?: string;
  resolvedAt?: string;
  aiResolutionSuggestedAt?: string;
  rating?: {
    id: string;
    dialogId: string;
    createdAt: string;
  };
}

export interface DialogEdge {
  cursor: string;
  node: DialogNode;
}

export interface DialogConnection {
  edges: DialogEdge[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
}

export interface DialogsResponse {
  data: {
    dialogs: DialogConnection;
  };
}

export interface DialogResponse {
  data: {
    dialog: DialogNode;
  };
}

// Hook options
export interface UseMingoDialogsOptions {
  enabled?: boolean;
  search?: string;
  limit?: number;
}
