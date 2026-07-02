import React, { useEffect, useState } from "react";
import client from "../../api/client";
import { Card, EmptyNote, Badge } from "../../components/ui";

const CHANNEL_BADGE = {
  EMAIL: { color: "#1D4FA0", bg: "#E8EFFB" },
  SMS: { color: "#B5790C", bg: "#FBF0D6" },
  WHATSAPP: { color: "#1D8A5F", bg: "#DEF3E9" },
};
const STATUS_BADGE = {
  SENT: { color: "#1D8A5F", bg: "#DEF3E9" },
  QUEUED: { color: "#B5790C", bg: "#FBF0D6" },
  FAILED: { color: "#C6402A", bg: "#FBE4DE" },
};

export default function AdminNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get("/admin/notifications").then(({ data }) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  return (
    <Card
      title="Notification Outbox"
      subtitle="Stubbed Email / SMS / WhatsApp sends — swap the three functions in backend/src/utils/notifications.js for a real provider (SendGrid, Twilio/MSG91, WhatsApp Business API) and this log keeps working unchanged"
    >
      {loading ? (
        <EmptyNote text="Loading…" />
      ) : items.length === 0 ? (
        <EmptyNote text="No notifications sent yet — trigger one by submitting or progressing a claim." />
      ) : (
        <table className="data-table">
          <thead><tr><th>Claim</th><th>Channel</th><th>To</th><th>Message</th><th>Status</th><th>Sent</th></tr></thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id}>
                <td style={{ fontFamily: "monospace" }}>{n.claim?.claimNumber}</td>
                <td><Badge {...CHANNEL_BADGE[n.channel]}>{n.channel}</Badge></td>
                <td>{n.toAddress}</td>
                <td style={{ maxWidth: 360 }}>{n.message}</td>
                <td><Badge {...STATUS_BADGE[n.status]}>{n.status}</Badge></td>
                <td>{new Date(n.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}