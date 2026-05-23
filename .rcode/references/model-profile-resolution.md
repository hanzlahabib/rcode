# Model Profile Resolution

Workflows pick a model via `node .rcode/bin/rcode-tools.cjs resolve-model
<role>`, which reads `.rcode/config.yaml` `model_profile` and returns the
concrete model id for that role per `rcode/config/model-profiles.json`.

If `model_profile` is unset, default is `balanced`. Unknown profile falls
back to `balanced` with a stderr warning.
