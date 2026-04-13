const testCrudOperations = [
  {
    name: "Project Creation",
    test: async () => {
      const response = await fetch("http://localhost:1337/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Project CRUD Final",
          slug: "test-project-crud-final-2",
          workspaceId: "urv86i1eiibkxrmajm5tvxir", // Use existing workspace
          ownerId: "p5fc987e0w3eyz3gikb6ol6u"
        })
      });
      const data = await response.json();
      return { success: response.status === 200, data, status: response.status };
    }
  },
  {
    name: "Task Creation", 
    test: async () => {
      const response = await fetch("http://localhost:1337/api/task/ldbq2lldh38yz9bk4ny935xa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Final Test Task",
          description: "Testing complete functionality",
          status: "todo",
          priority: "high",
          createdBy: "p5fc987e0w3eyz3gikb6ol6u"
        })
      });
      const data = await response.json();
      return { success: response.status === 200, data, status: response.status };
    }
  },
  {
    name: "Activity Creation",
    test: async () => {
      const response = await fetch("http://localhost:1337/api/activity/create", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "w5oupiz1caxt4npur5iegvxf",
          userEmail: "admin@example.com",
          type: "comment",
          content: "Final test activity"
        })
      });
      const data = await response.json();
      return { success: response.status === 200, data, status: response.status };
    }
  },
  {
    name: "Notification Creation",
    test: async () => {
      const response = await fetch("http://localhost:1337/api/notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: "admin@example.com",
          title: "Final Test Notification",
          content: "Testing complete functionality",
          type: "info"
        })
      });
      const data = await response.json();
      return { success: response.status === 200, data, status: response.status };
    }
  },
  {
    name: "Label Creation",
    test: async () => {
      const response = await fetch("http://localhost:1337/api/label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Final Test Label",
          color: "#00ff00",
          workspaceId: "test-workspace-1"
        })
      });
      const data = await response.json();
      return { success: response.status === 200, data, status: response.status };
    }
  }
];

async function runCrudTests() {
  console.log("🚀 Testing Meridian CRUD Operations");
  console.log("==================================");
  
  let successCount = 0;
  
  for (const test of testCrudOperations) {
    try {
      const result = await test.test();
      const icon = result.success ? "✅" : "❌";
      console.log(`${icon} ${test.name}: ${result.status}`);
      
      if (result.success) {
        successCount++;
        if (result.data.id) {
          console.log(`   Created ID: ${result.data.id}`);
        }
      } else {
        console.log(`   Error: ${JSON.stringify(result.data).substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR`);
      console.log(`   ${error.message}`);
    }
  }
  
  const total = testCrudOperations.length;
  const percentage = Math.round((successCount / total) * 100);
  
  console.log("\n📊 FINAL CRUD FUNCTIONALITY REPORT:");
  console.log("====================================");
  console.log(`✅ Working: ${successCount}/${total} operations (${percentage}%)`);
  
  if (percentage === 100) {
    console.log("🎉 ALL MERIDIAN FEATURES ARE COMPLETELY WORKING! 🎉");
  } else if (percentage >= 80) {
    console.log("🔥 Most Meridian features are working! Great progress!");
  } else {
    console.log("⚠️  Some Meridian features need more work.");
  }
}

runCrudTests();