/**
 * Generates an instant WhatsApp Web / App intent URL
 * pre-populated with verified trauma details and direct donor response link.
 */
export function generateWhatsAppBroadcastUrl({
  hospitalName,
  district,
  bloodGroup,
  unitsRequired,
  urgencyLevel = 'CRITICAL TRAUMA',
  contactPhone,
  requestId,
}) {
  const portalUrl = window.location.origin;
  const directLink = requestId ? `${portalUrl}/donor?request=${requestId}` : portalUrl;

  const message = 
`🚨 *EMERGENCY BLOOD REQUIREMENT - VITALCONNECT AI* 🚨

🏥 *Facility:* ${hospitalName}
📍 *District / Area:* ${district}
🩸 *Blood Group Needed:* *${bloodGroup}* (${unitsRequired} Unit${Number(unitsRequired) > 1 ? 's' : ''})
⚡ *Urgency Level:* ${urgencyLevel.toUpperCase()}
📞 *Hospital Direct Desk:* ${contactPhone || '108 / Emergency Bay'}

Every minute counts. If you or someone you know is an eligible donor in ${district}, please respond or visit the trauma center immediately.

👉 *Confirm Donor Response Live:*
${directLink}

_Please forward to regional groups in ${district}._`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}