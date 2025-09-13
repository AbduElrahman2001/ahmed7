const mongoose = require("mongoose");

const uri = "mongodb+srv://Abdo_2001:Deadpool2001.@cluster0.li3exar.mongodb.net/balha-barbershop?retryWrites=true&w=majority&appName=Cluster0";

async function testConnection() {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Successfully connected to MongoDB Atlas");
    process.exit(0); // خروج بعد النجاح
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // خروج بعد الفشل
  }
}

testConnection();
