const testEndpoints = [
  { name: "Main API", url: "http://localhost:1337/api", method: "GET" },
  { name: "Project Module", url: "http://localhost:1337/api/project", method: "GET" },
  { name: "Task Module", url: "http://localhost:1337/api/task", method: "GET" },
  { name: "Activity Module", url: "http://localhost:1337/api/activity", method: "GET" },
  { name: "Notification Module", url: "http://localhost:1337/api/notification", method: "GET" },
  { name: "Label Module", url: "http://localhost:1337/api/label", method: "GET" },
];

async function testEndpoint(test) {
  try {
    const response = await fetch(test.url, { method: test.method });
    const status = response.status;
    const text = await response.text();
    
    return {
      name: test.name,
      status: status,
      success: status < 400,
      response: text.length > 200 ? text.substring(0, 200) + "..." : text
    };
  } catch (error) {
    return {
      name: test.name,
      status: "ERROR",
      success: false,
      response: error.message
    };
  }
}

async function runTests() {
  console.log("🧪 Testing Meridian API Endpoints");
  console.log("================================");
  
  for (const test of testEndpoints) {
    const result = await testEndpoint(test);
    const icon = result.success ? "✅" : "❌";
    console.log(`${icon} ${result.name}: ${result.status}`);
    if (!result.success) {
      console.log(`   Error: ${result.response}`);
    }
  }
  
  console.log("\n📊 Summary:");
  const results = await Promise.all(testEndpoints.map(testEndpoint));
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  console.log(`${successful}/${total} endpoints working (${Math.round(successful/total*100)}%)`);
}

runTests();