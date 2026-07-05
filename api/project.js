export default async function handler(req, res) {
  const redisUrl   = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return res.status(500).json({ error: "Redis not configured" });
  }

  const headers = {
    Authorization: `Bearer ${redisToken}`,
    "Content-Type": "application/json",
  };

  const projectKey = (projectCode) => `project:${String(projectCode || "").toUpperCase().trim()}`;
  const normaliseCode = (value) => String(value || "").toUpperCase().trim();
  const findMember = (state, memberCode) => {
    const code = normaliseCode(memberCode);
    if (!code) return null;
    return (state?.l2?.loginCodes || []).find(lc => normaliseCode(lc.loginCode) === code) || null;
  };
  const canWriteProject = (member) => !!member && (member.isPM || member.role === "Project Manager");
  const redisGet = async (key) => {
    const r = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers,
      body: JSON.stringify([["GET", key]]),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Redis error");
    return data[0]?.result;
  };

  // GET — load project
  if (req.method === "GET") {
    const { projectCode, memberCode } = req.query;
    if (!projectCode) return res.status(400).json({ error: "projectCode required" });

    const key = projectKey(projectCode);
    const raw = await redisGet(key);

    if (!raw) return res.status(404).json({ error: "Project not found" });

    const project = JSON.parse(raw);

    // Validate member code if provided
    if (memberCode) {
      const member = project.l2?.loginCodes?.find(
        lc => normaliseCode(lc.loginCode) === normaliseCode(memberCode)
      );
      if (!member) return res.status(401).json({ error: "Invalid member code" });
      return res.status(200).json({ project, member });
    }

    return res.status(200).json({ project });
  }

  // POST — save project
  if (req.method === "POST") {
    const { projectCode, state, memberCode } = req.body;
    if (!projectCode || !state) return res.status(400).json({ error: "projectCode and state required" });
    if (!memberCode) return res.status(401).json({ error: "memberCode required" });

    const key = projectKey(projectCode);
    const value = JSON.stringify(state);
    const existingRaw = await redisGet(key);
    if (existingRaw) {
      const member = findMember(JSON.parse(existingRaw), memberCode);
      if (!member) {
        return res.status(403).json({ error: "Valid team member code required to save project state" });
      }
    } else {
      const member = findMember(state, memberCode);
      if (!canWriteProject(member)) {
        return res.status(403).json({ error: "Initial save requires a Project Manager login code in the project state" });
      }
    }

    const r = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers,
      body: JSON.stringify([["SET", key, value]]),
    });

    const data = await r.json();
    return res.status(200).json({ ok: true, key });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
