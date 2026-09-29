const fs = require('fs');
const file = 'c:/Ashish/NewWebapp/CRM/src/app/dashboard/incentives/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the first Badge block
content = content.replace(
  /<Badge variant={rule\.targetType === 'Employee' \? 'default' : 'secondary'} className=\{([^}]+)\}>\s*\{rule\.targetType\}\s*<\/Badge>/g,
  `<span className={\`px-2 py-1 text-xs font-semibold rounded-full \${rule.targetType === 'Employee' ? 'bg-[#092b49] text-white' : rule.targetType === 'TeamOwner' ? 'bg-[#bd922d] text-white' : 'bg-gray-200 text-gray-800 dark:bg-zinc-800 dark:text-zinc-200'}\`}>\n                          {rule.targetType}\n                        </span>`
);

// Replace the second Badge block
content = content.replace(
  /<Badge variant="outline" className=\{rule\.isActive \? "border-green-500 text-green-500" : "border-red-500 text-red-500"}>\s*\{rule\.isActive \? "Active" : "Inactive"\}\s*<\/Badge>/g,
  `<span className={\`px-2 py-1 text-xs font-semibold rounded-full border \${rule.isActive ? "border-green-500 text-green-500 bg-green-50 dark:bg-green-950/30" : "border-red-500 text-red-500 bg-red-50 dark:bg-red-950/30"}\`}>\n                          {rule.isActive ? "Active" : "Inactive"}\n                        </span>`
);

fs.writeFileSync(file, content, 'utf8');
console.log("Successfully replaced Badges.");
