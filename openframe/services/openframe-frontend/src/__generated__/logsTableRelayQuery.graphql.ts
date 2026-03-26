/**
 * @generated SignedSource<<8969abc84fe78faa68c4c7fa046e4b90>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type LogFilterInput = {
  deviceId?: string | null | undefined;
  endDate?: any | null | undefined;
  eventTypes?: ReadonlyArray<string> | null | undefined;
  organizationIds?: ReadonlyArray<string> | null | undefined;
  severities?: ReadonlyArray<string> | null | undefined;
  startDate?: any | null | undefined;
  toolTypes?: ReadonlyArray<string> | null | undefined;
};
export type logsTableRelayQuery$variables = {
  after?: string | null | undefined;
  filter?: LogFilterInput | null | undefined;
  first: number;
  search?: string | null | undefined;
};
export type logsTableRelayQuery$data = {
  readonly logFilters: {
    readonly eventTypes: ReadonlyArray<string>;
    readonly organizations: ReadonlyArray<{
      readonly id: string;
      readonly name: string;
    }>;
    readonly severities: ReadonlyArray<string>;
    readonly toolTypes: ReadonlyArray<string>;
  };
  readonly " $fragmentSpreads": FragmentRefs<"logsTableRelay_query">;
};
export type logsTableRelayQuery = {
  response: logsTableRelayQuery$data;
  variables: logsTableRelayQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "after"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "filter"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "first"
},
v3 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "search"
},
v4 = {
  "kind": "Variable",
  "name": "filter",
  "variableName": "filter"
},
v5 = [
  {
    "kind": "Variable",
    "name": "after",
    "variableName": "after"
  },
  (v4/*: any*/),
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "first"
  },
  {
    "kind": "Variable",
    "name": "search",
    "variableName": "search"
  }
],
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": [
    (v4/*: any*/)
  ],
  "concreteType": "LogFilters",
  "kind": "LinkedField",
  "name": "logFilters",
  "plural": false,
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "toolTypes",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "eventTypes",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "severities",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "OrganizationFilterOption",
      "kind": "LinkedField",
      "name": "organizations",
      "plural": true,
      "selections": [
        (v6/*: any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "name",
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*: any*/),
      (v1/*: any*/),
      (v2/*: any*/),
      (v3/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "logsTableRelayQuery",
    "selections": [
      {
        "args": (v5/*: any*/),
        "kind": "FragmentSpread",
        "name": "logsTableRelay_query"
      },
      (v7/*: any*/)
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v1/*: any*/),
      (v2/*: any*/),
      (v0/*: any*/),
      (v3/*: any*/)
    ],
    "kind": "Operation",
    "name": "logsTableRelayQuery",
    "selections": [
      {
        "alias": null,
        "args": (v5/*: any*/),
        "concreteType": "LogConnection",
        "kind": "LinkedField",
        "name": "logs",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "LogEdge",
            "kind": "LinkedField",
            "name": "edges",
            "plural": true,
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "LogEvent",
                "kind": "LinkedField",
                "name": "node",
                "plural": false,
                "selections": [
                  (v6/*: any*/),
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "toolEventId",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "eventType",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "ingestDay",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "toolType",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "severity",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "userId",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "deviceId",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "hostname",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "organizationId",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "organizationName",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "summary",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "timestamp",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "__typename",
                    "storageKey": null
                  }
                ],
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "cursor",
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "PageInfo",
            "kind": "LinkedField",
            "name": "pageInfo",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "hasNextPage",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "endCursor",
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": (v5/*: any*/),
        "filters": [
          "filter",
          "search"
        ],
        "handle": "connection",
        "key": "logsTableRelay_logs",
        "kind": "LinkedHandle",
        "name": "logs"
      },
      (v7/*: any*/)
    ]
  },
  "params": {
    "cacheID": "d6034a2d986d60fa15f4c1a2625c4377",
    "id": null,
    "metadata": {},
    "name": "logsTableRelayQuery",
    "operationKind": "query",
    "text": "query logsTableRelayQuery(\n  $filter: LogFilterInput\n  $first: Int!\n  $after: String\n  $search: String\n) {\n  ...logsTableRelay_query_2zR4qx\n  logFilters(filter: $filter) {\n    toolTypes\n    eventTypes\n    severities\n    organizations {\n      id\n      name\n    }\n  }\n}\n\nfragment logsTableRelay_query_2zR4qx on Query {\n  logs(filter: $filter, first: $first, after: $after, search: $search) {\n    edges {\n      node {\n        id\n        toolEventId\n        eventType\n        ingestDay\n        toolType\n        severity\n        userId\n        deviceId\n        hostname\n        organizationId\n        organizationName\n        summary\n        timestamp\n        __typename\n      }\n      cursor\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "a2e585d0d2247cbc1d5c9970fef1e0d3";

export default node;
