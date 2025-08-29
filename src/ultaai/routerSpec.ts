export const ROUTER_SYSTEM_PROMPT = `You are UltaAI Router. Input contains: user_request, heartbeat, candidates[], command_policies[], policy_notes. Decide one of four outputs, return one compact JSON only:

1) Confirmed batch:
{"task":"<script_key>","batch_id":"<uuid>","params":{...},"status":"confirmed","risk":"<low|medium|high>","preflight":[ "...short items..." ]}

2) Custom shell:
{"task":"custom_shell","params":{"description":"<short>","shell":"<one safe command>"},"status":"unconfirmed","risk":"<low|medium|high>"}

3) Proposed batch (no exact match, you create one):
{"task":"proposed_batch","status":"unconfirmed","batch":{
  "key":"<slug>",
  "name":"<human title>",
  "risk":"<low|medium|high>",
  "description":"<1 sentence>",
  "inputs_schema":{...json schema...},
  "inputs_defaults":{...},
  "preflight":{"checks":[ ...objects like {type,min_free_gb,...} ]},
  "commands":[ "<one command per line, no pipes, no &&, no ;>" ]
}}

4) Not supported:
{"task":"not_supported","reason":"<short>"}

Rules:
- Pick best match from candidates by name, key, description
- Enforce candidates[i].preflight against heartbeat before confirming
- Risk for confirmed batch = candidates[i].risk
- Risk for custom_shell or proposed_batch = set based on potential impact
- Never output multiple commands joined by pipes or && or ;
- Obey policy_notes thresholds
- Validate shell against command_policies, do not emit forbidden content
- Only one JSON object, no prose`;

export const ROUTER_RESPONSE_SCHEMA = {
  "type":"object",
  "oneOf":[
    { "type":"object","required":["task","batch_id","params","status","risk","preflight"],
      "properties":{
        "task":{"type":"string"},
        "batch_id":{"type":"string"},
        "params":{"type":"object","additionalProperties":{"type":["string","number","boolean","null"]}},
        "status":{"type":"string","enum":["confirmed"]},
        "risk":{"type":"string","enum":["low","medium","high"]},
        "preflight":{"type":"array","items":{"type":"string"}}
      },
      "additionalProperties":false
    },
    { "type":"object","required":["task","params","status","risk"],
      "properties":{
        "task":{"type":"string","enum":["custom_shell"]},
        "params":{"type":"object","required":["description","shell"],
          "properties":{"description":{"type":"string"},"shell":{"type":"string"}},
          "additionalProperties":false
        },
        "status":{"type":"string","enum":["unconfirmed"]},
        "risk":{"type":"string","enum":["low","medium","high"]}
      },
      "additionalProperties":false
    },
    { "type":"object","required":["task","status","batch"],
      "properties":{
        "task":{"type":"string","enum":["proposed_batch"]},
        "status":{"type":"string","enum":["unconfirmed"]},
        "batch":{"type":"object","required":["key","name","risk","description","inputs_schema","inputs_defaults","preflight","commands"],
          "properties":{
            "key":{"type":"string"},
            "name":{"type":"string"},
            "risk":{"type":"string","enum":["low","medium","high"]},
            "description":{"type":"string"},
            "inputs_schema":{"type":"object"},
            "inputs_defaults":{"type":"object"},
            "preflight":{"type":"object"},
            "commands":{"type":"array","items":{"type":"string"}}
          },
          "additionalProperties":false
        }
      },
      "additionalProperties":false
    },
    { "type":"object","required":["task","reason"],
      "properties":{
        "task":{"type":"string","enum":["not_supported"]},
        "reason":{"type":"string"}
      },
      "additionalProperties":false
    }
  ]
};

export const INPUT_FILLER_SYSTEM_PROMPT = `You fill inputs for a batch. Input has inputs_schema, inputs_defaults, and params. Output JSON only: {"inputs":{...}}. Start with defaults, overwrite with params, drop keys not in schema, ensure all required are present.`;

export const PROPOSED_BATCH_SCHEMA = {
  type: "object",
  required: [
    "key",
    "name",
    "risk",
    "description",
    "inputs_schema",
    "inputs_defaults",
    "preflight",
    "commands"
  ],
  properties: {
    key: { type: "string" },                // slug like "install_custom_tool"
    name: { type: "string" },               // human-readable title
    risk: { type: "string", enum: ["low","medium","high"] },
    description: { type: "string" },        // one-sentence description
    inputs_schema: { type: "object" },      // JSON Schema for params
    inputs_defaults: { type: "object" },    // default values
    preflight: { type: "object" },          // object with "checks":[]
    commands: { 
      type: "array", 
      items: { type: "string" }             // one safe shell command per line
    }
  },
  additionalProperties: false
};