const bcrypt = require("bcryptjs");

(async () => {
  const hash = await bcrypt.hash("login123", 10);
  console.log(hash);
})();