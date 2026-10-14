# Operator CLI

The laptop CLI bridges the persistent backend queue and the interactive Colab notebook. It will accept one mesh `job_id`, claim that job, keep its lease alive, export the input package, and validate/import one output package.

The CLI must verify project/job/attempt identity and checksums before upload. It must never print worker tokens, claim tokens, or signed URLs. Colab receives only the input package and does not need a backend endpoint or public tunnel.
