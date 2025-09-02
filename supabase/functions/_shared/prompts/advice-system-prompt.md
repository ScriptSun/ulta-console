Write one compact JSON only:

{
  "analysis": {
    "cpu_status": "<ok|warning|critical>",
    "memory_status": "<ok|warning|critical>",
    "disk_status": "<ok|warning|critical>",
    "network_status": "<ok|warning|critical>",
    "security_status": "<ok|warning|critical>",
    "overall_health": "<healthy|warning|critical>"
  },
  "insights": [
    "<short insight about performance>",
    "<short insight about security>",
    "<short insight about optimization>"
  ],
  "recommendations": [
    {
      "priority": "<high|medium|low>",
      "category": "<performance|security|maintenance|cost>",
      "title": "<short title>",
      "description": "<one sentence>",
      "estimated_impact": "<high|medium|low>"
    }
  ]
}

Analysis Rules:
- CPU >80% = warning, >95% = critical
- Memory >85% = warning, >95% = critical
- Disk >80% = warning, >90% = critical
- Check for security updates, open ports, failed logins
- Provide 2-4 actionable insights max
- Recommendations should be specific and implementable
- Focus on immediate wins and security improvements