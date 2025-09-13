# BALHA صالون الحلاقة - نظام إدارة الأدوار

نظام متكامل لإدارة أدوار صالون الحلاقة مع دعم كامل للغة العربية وواجهة مستخدم حديثة.

## 🌟 المميزات

### للعملاء
- **أخذ دور فوري**: يمكن للعملاء أخذ أدوارهم فوراً بإدخال الاسم ورقم الجوال
- **متابعة الحالة**: عرض حالة الدور والوقت المتوقع للانتظار
- **إلغاء الدور**: إمكانية إلغاء الدور في أي وقت
- **دعم عربي كامل**: واجهة مستخدم باللغة العربية مع دعم RTL

### للمدير
- **لوحة تحكم متقدمة**: عرض جميع الأدوار مع إمكانية التصفية والترتيب
- **إدارة الأدوار**: إكمال وإلغاء الأدوار مع إعادة ترتيب تلقائية
- **إرسال إشعارات SMS**: إرسال رسائل نصية للعملاء
- **إحصائيات متقدمة**: عرض إحصائيات مفصلة عن الأدوار والخدمات
- **نظام أمان**: تسجيل دخول آمن مع حماية من محاولات الاختراق

## 🚀 التقنيات المستخدمة

### Backend
- **Node.js** - بيئة تشغيل JavaScript
- **Express.js** - إطار عمل الويب
- **MongoDB** - قاعدة بيانات NoSQL
- **Mongoose** - ODM لـ MongoDB
- **JWT** - مصادقة آمنة
- **bcryptjs** - تشفير كلمات المرور
- **express-validator** - التحقق من صحة البيانات

### Frontend
- **HTML5** - هيكل الصفحة
- **CSS3** - التصميم والأنيميشن
- **JavaScript (ES6+)** - التفاعل والوظائف
- **Font Awesome** - الأيقونات
- **Google Fonts** - الخطوط العربية

## 📋 المتطلبات

- Node.js (الإصدار 14 أو أحدث)
- MongoDB (محلي أو سحابي)
- npm أو yarn

## 🛠️ التثبيت والإعداد

### 1. استنساخ المشروع
```bash
git clone <repository-url>
cd BALHA
```

### 2. تثبيت التبعيات
```bash
npm install
```

### 3. إعداد متغيرات البيئة
قم بإنشاء ملف `config.env` في المجلد الرئيسي:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/balha-barbershop
MONGODB_URI_PROD=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/balha-barbershop

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=24h

# SMS Configuration (for future integration)
SMS_API_KEY=your-sms-api-key
SMS_SENDER_ID=BALHA

# Admin Default Credentials
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. تشغيل MongoDB
```bash
# تشغيل MongoDB محلياً
mongod

# أو استخدام MongoDB Atlas (سحابي)
```

### 5. تشغيل التطبيق
```bash
# وضع التطوير
npm run dev

# وضع الإنتاج
npm start
```

### 6. الوصول للتطبيق
- **الواجهة الأمامية**: http://localhost:3000
- **API**: http://localhost:3000/api
- **صفحة الحالة**: http://localhost:3000/api/health

## 🔐 بيانات الدخول الافتراضية

- **اسم المستخدم**: admin
- **كلمة المرور**: admin123

## 📚 API Endpoints

### المصادقة (Authentication)
- `POST /api/auth/login` - تسجيل دخول المدير
- `GET /api/auth/me` - معلومات المستخدم الحالي
- `POST /api/auth/logout` - تسجيل الخروج
- `PUT /api/auth/change-password` - تغيير كلمة المرور
- `POST /api/auth/register` - إنشاء مدير جديد

### إدارة الأدوار (Turns)
- `POST /api/turns` - إنشاء دور جديد
- `GET /api/turns/customer/:mobileNumber` - البحث عن دور بالرقم
- `PUT /api/turns/cancel/:mobileNumber` - إلغاء الدور
- `GET /api/turns/stats` - إحصائيات الأدوار
- `GET /api/turns/waiting` - الأدوار المنتظرة
- `GET /api/turns/:id` - تفاصيل دور محدد

### لوحة تحكم المدير (Admin)
- `GET /api/admin/turns` - جميع الأدوار مع التصفية
- `GET /api/admin/turns/waiting` - الأدوار المنتظرة فقط
- `PUT /api/admin/turns/:id/complete` - إكمال دور
- `PUT /api/admin/turns/:id/cancel` - إلغاء دور
- `POST /api/admin/turns/:id/sms` - إرسال رسالة SMS
- `GET /api/admin/dashboard` - إحصائيات لوحة التحكم
- `PUT /api/admin/turns/:id/notes` - تحديث ملاحظات الدور

## 🗄️ هيكل قاعدة البيانات

### نموذج المستخدم (User)
```javascript
{
  username: String,        // اسم المستخدم
  password: String,        // كلمة المرور (مشفرة)
  type: String,           // نوع المستخدم (admin/customer)
  isActive: Boolean,      // حالة الحساب
  lastLogin: Date,        // آخر تسجيل دخول
  loginAttempts: Number,  // عدد محاولات الدخول
  lockUntil: Date         // وقت قفل الحساب
}
```

### نموذج الدور (Turn)
```javascript
{
  customerName: String,     // اسم العميل
  mobileNumber: String,     // رقم الجوال
  serviceType: String,      // نوع الخدمة
  turnNumber: Number,        // رقم الدور
  status: String,           // حالة الدور
  estimatedWaitTime: Number, // الوقت المتوقع للانتظار
  completedAt: Date,        // وقت الإكمال
  cancelledAt: Date,        // وقت الإلغاء
  cancelledBy: String,      // من ألغى الدور
  notes: String,            // ملاحظات
  smsSent: Boolean,         // هل تم إرسال SMS
  smsSentAt: Date,          // وقت إرسال SMS
  smsMessage: String        // محتوى رسالة SMS
}
```

## 🔒 الأمان

### حماية من الهجمات
- **Rate Limiting**: تحديد عدد الطلبات لكل IP
- **Helmet**: حماية من هجمات الويب الشائعة
- **CORS**: التحكم في طلبات Cross-Origin
- **Input Validation**: التحقق من صحة البيانات المدخلة
- **Password Hashing**: تشفير كلمات المرور بـ bcrypt
- **JWT Tokens**: مصادقة آمنة بدون حالة

### قفل الحسابات
- قفل تلقائي بعد 5 محاولات فاشلة
- مدة القفل: ساعتان
- إعادة تعيين العداد عند تسجيل الدخول بنجاح

## 📱 دعم SMS

### التكامل المستقبلي
النظام جاهز للتكامل مع خدمات SMS مثل:
- Twilio
- Vonage (Nexmo)
- AWS SNS
- خدمات SMS المحلية

### إعداد SMS
```javascript
// في ملف config.env
SMS_API_KEY=your-sms-api-key
SMS_SENDER_ID=BALHA
```

## 🚀 النشر (Deployment)

### Heroku
```bash
# إنشاء تطبيق Heroku
heroku create balha-barbershop

# إضافة متغيرات البيئة
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI_PROD=your-mongodb-uri
heroku config:set JWT_SECRET=your-secret-key

# النشر
git push heroku main
```

### Vercel
```bash
# تثبيت Vercel CLI
npm i -g vercel

# النشر
vercel --prod
```

### Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 الاختبار

```bash
# تشغيل الاختبارات
npm test

# اختبار API
npm run test:api

# اختبار الواجهة الأمامية
npm run test:frontend
```

## 📊 المراقبة والتتبع

### Logging
- تسجيل جميع العمليات
- تسجيل الأخطاء مع التفاصيل
- تسجيل محاولات الاختراق

### Metrics
- عدد الأدوار النشطة
- متوسط وقت الانتظار
- إحصائيات الخدمات
- معدل الإلغاء

## 🔧 التخصيص

### تغيير الخدمات
```javascript
// في models/Turn.js
const serviceTypes = {
  'haircut': 'قص شعر',
  'beard-trim': 'قص لحية',
  'haircut-beard': 'قص شعر + لحية',
  'shampoo': 'غسيل شعر',
  'styling': 'تسريحة'
};
```

### تغيير الرسائل
```javascript
// في routes/turns.js
const messages = {
  turnCreated: 'تم تأكيد الدور {turnNumber}! ستستلم رسالة نصية عندما يحين دورك.',
  turnCompleted: 'تم إكمال دورك! شكراً لك',
  turnCancelled: 'تم إلغاء دورك بنجاح'
};
```

## 🐛 استكشاف الأخطاء

### مشاكل شائعة

1. **خطأ في الاتصال بقاعدة البيانات**
   ```bash
   # تأكد من تشغيل MongoDB
   mongod
   
   # تحقق من URI
   echo $MONGODB_URI
   ```

2. **خطأ في المصادقة**
   ```bash
   # تحقق من JWT_SECRET
   echo $JWT_SECRET
   
   # إعادة إنشاء المدير الافتراضي
   npm run reset-admin
   ```

3. **خطأ في CORS**
   ```javascript
   // في server.js
   app.use(cors({
     origin: ['http://localhost:3000', 'https://your-domain.com']
   }));
   ```

## 🤝 المساهمة

1. Fork المشروع
2. إنشاء فرع جديد (`git checkout -b feature/AmazingFeature`)
3. Commit التغييرات (`git commit -m 'Add some AmazingFeature'`)
4. Push للفرع (`git push origin feature/AmazingFeature`)
5. فتح Pull Request

## 📄 الرخصة

هذا المشروع مرخص تحت رخصة MIT - انظر ملف [LICENSE](LICENSE) للتفاصيل.

## 📞 الدعم

- **البريد الإلكتروني**: support@balha.com
- **الهاتف**: +966-XX-XXX-XXXX
- **الواتساب**: +966-XX-XXX-XXXX

## 🙏 الشكر

- [Font Awesome](https://fontawesome.com/) للأيقونات
- [Google Fonts](https://fonts.google.com/) للخطوط العربية
- [Express.js](https://expressjs.com/) لإطار العمل
- [MongoDB](https://www.mongodb.com/) لقاعدة البيانات

---

**BALHA صالون الحلاقة** - نظام إدارة الأدوار المتكامل 🪒✨

