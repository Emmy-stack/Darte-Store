# 🛍️ Darté

**Darté** is a modern multi-vendor e-commerce marketplace designed to help individuals and businesses buy and sell products seamlessly. Built with Next.js, Tailwind CSS, and a scalable backend architecture, Darté empowers sellers to create stores, manage products, receive orders, and grow their businesses while providing customers with a beautiful shopping experience.

---

## ✨ Features

### 🛒 Customer Features

* Browse products across multiple categories
* Search and filter products
* Product reviews and ratings
* Wishlist/Favorites
* Shopping cart functionality
* Secure checkout experience
* Order tracking
* User profiles and order history
* Recommended products based on ratings and popularity

### 🏪 Seller Features

* Seller registration and onboarding
* Admin approval system for sellers
* Product management dashboard
* Upload and manage products
* Order management
* Sales analytics
* Seller notifications for new orders and payments
* Linked payout accounts
* Subscription-based seller accounts

### 👨‍💼 Admin Features

* Vendor approval and management
* Product moderation
* User management
* Platform analytics
* Commission management
* Subscription monitoring
* Revenue tracking
* Marketplace oversight

### 💳 Marketplace Features

* Real payment integration
* Automated revenue split:

  * 90% to Seller
  * 10% to Platform
* Secure transactions
* Scalable multi-vendor architecture
* Cloud-based image storage

---

## 🛠️ Tech Stack

### Frontend

* Next.js
* React
* Tailwind CSS
* Redux Toolkit
* Lucide React

### Backend

* Node.js
* Express.js
* MongoDB
* JWT Authentication

### Storage & Services

* Cloudinary (Image Storage)
* Payment Gateway Integration (Paystack / Flutterwave)
* Email Notifications

---

## 📂 Product Categories

* All Products
* Men
* Women
* Gadgets
* Clothing
* Jewelry
* Gifts

---

## 🚀 Getting Started

### Clone the Repository

```bash
git clone https://github.com/yourusername/darte.git
cd darte
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env.local` file:

```env
MONGODB_URI=
JWT_SECRET=
PAYSTACK_SECRET_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Run Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 📈 Business Model

Darté operates as a marketplace platform where independent sellers can list and sell products.

### Seller Subscription

* Sellers must be approved by an administrator.
* Sellers pay a monthly subscription fee to maintain active seller status.
* Inactive subscriptions may result in seller account suspension.

### Revenue Split

For every successful order:

```text
Seller → 90%
Darté Platform → 10%
```

This ensures sellers maximize earnings while supporting platform growth and maintenance.

---

## 🎯 Vision

Our mission is to empower entrepreneurs and small businesses by providing a reliable, beautiful, and scalable marketplace where anyone can sell products, reach customers, and grow their brand.

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/amazing-feature
```

3. Commit your changes

```bash
git commit -m "Add amazing feature"
```

4. Push to your branch

```bash
git push origin feature/amazing-feature
```

5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License.

---

## 🌐 Darté

**Shop. Sell. Grow.**

A marketplace built for modern commerce.
