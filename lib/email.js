import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";

// Create reusable transporter using SMTP variables
const getTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

/**
 * Sends a notification email to the buyer when the seller marks the order as delivered.
 */
export async function sendDeliveryNotificationEmail(order, buyerEmail, buyerName) {
    try {
        const transporter = getTransporter();
        const base_url = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const confirmationLink = `${base_url}/orders`;

        const mailOptions = {
            from: `"Darté Store" <${process.env.SMTP_USER || "no-reply@darte.com"}>`,
            to: buyerEmail,
            subject: "Your Order has been Delivered! - Action Required",
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg">
                    <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">Order Delivered!</h2>
                    <p>Hello <strong>${buyerName}</strong>,</p>
                    <p>Great news! The seller has marked your order <strong>#${order.id}</strong> as successfully delivered.</p>
                    <p>Please log in to your account dashboard and confirm whether you have received the item. Once you confirm, we will release the payment to the seller.</p>
                    <p>If you did not receive your order or if there is an issue, you can deny the delivery in your dashboard to dispute the claim.</p>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${confirmationLink}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 9999px; font-weight: bold;">Go to My Orders</a>
                    </div>
                    <p style="font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                        Thank you for shopping on Darté! If you have any questions, please contact support.
                    </p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Delivery notification email sent to", buyerEmail, "MessageId:", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending delivery notification email:", error);
    }
}

/**
 * Sends a dispute notification email to the seller and all admins when the buyer denies delivery.
 */
export async function sendDeliveryDenialEmail(order) {
    try {
        const transporter = getTransporter();
        
        // Fetch all admins
        const admins = await prisma.user.findMany({
            where: { role: "admin" },
            select: { email: true }
        });
        const adminEmails = admins.map(a => a.email);
        
        // Target list of admin and seller
        const recipientList = [
            order.store.email,
            ...adminEmails
        ].filter(Boolean);

        if (recipientList.length === 0) {
            console.warn("No recipients found to send delivery denial email");
            return;
        }

        const mailOptions = {
            from: `"Darté Store Dispute System" <${process.env.SMTP_USER || "alerts@darte.com"}>`,
            to: recipientList.join(", "),
            subject: `⚠️ URGENT: Delivery Denied for Order #${order.id}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
                    <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Delivery Dispute Alert</h2>
                    <p>This is an automated alert that the buyer has <strong>DENIED</strong> the delivery of order <strong>#${order.id}</strong>.</p>
                    
                    <div style="background-color: #f8fafc; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1e293b;">Order Details</h3>
                        <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order.id}</p>
                        <p style="margin: 5px 0;"><strong>Store Name:</strong> ${order.store.name} (${order.store.email})</p>
                        <p style="margin: 5px 0;"><strong>Order Total:</strong> ${order.total}</p>
                        <p style="margin: 5px 0;"><strong>Payment Status:</strong> Escrow Secured (Unreleased)</p>
                    </div>

                    <p><strong>Required Action:</strong> Payment to the seller for this order has been suspended. Admin or the store manager needs to contact the buyer and resolve this issue.</p>
                    <p style="font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                        Darté Store Dispute Management
                    </p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Delivery denial email sent to:", recipientList, "MessageId:", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending delivery denial email:", error);
    }
}
