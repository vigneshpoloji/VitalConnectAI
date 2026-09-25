import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';

export function downloadDonorCertificate({ donorName, bloodGroup, unitsDonated = 1, facilityName, date }) {
  // 1. Trigger celebratory confetti
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
  });

  // 2. Generate PDF Certificate (Landscape format)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const certId = `VC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const donationDate = date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Background & Borders
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 297, 210, 'F');

  // Outer Crimson Border
  doc.setDrawColor(189, 18, 48);
  doc.setLineWidth(2.5);
  doc.rect(10, 10, 277, 190);

  // Inner Accent Border
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.5);
  doc.rect(14, 14, 269, 182);

  // Header Title
  doc.setTextColor(189, 18, 48);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('VitalConnectAI', 148.5, 38, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('PRECISION CARE · HUMAN IMPACT · VERIFIED CARE NETWORK', 148.5, 46, { align: 'center' });

  // Certificate Label
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICATE OF COMMENDATION', 148.5, 66, { align: 'center' });

  // Body Copy
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('This certificate is proudly conferred in recognition of the life-saving blood donation by', 148.5, 82, { align: 'center' });

  // Donor Name
  doc.setFontSize(26);
  doc.setTextColor(185, 28, 28);
  doc.setFont('helvetica', 'bold');
  doc.text(donorName || 'Distinguished Donor', 148.5, 98, { align: 'center' });

  // Donation Details
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `For generously contributing ${unitsDonated} unit(s) of Blood Group [ ${bloodGroup || 'O+'} ] at ${facilityName || 'District Healthcare Network'}.`,
    148.5,
    114,
    { align: 'center' }
  );

  doc.text('Your voluntary donation helps save up to three lives in emergency clinical trauma and surgery.', 148.5, 122, { align: 'center' });

  // Verification Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(80, 136, 137, 24, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Digital Verification ID: ${certId}`, 148.5, 145, { align: 'center' });
  doc.text(`Recorded Date: ${donationDate} · Status: Medically Verified`, 148.5, 153, { align: 'center' });

  // Signatures
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Care Coordination Team', 60, 178, { align: 'center' });
  doc.text('Medical Director / Blood Bank', 237, 178, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.setDrawColor(148, 163, 184);
  doc.line(35, 172, 85, 172);
  doc.line(212, 172, 262, 172);

  // Download
  doc.save(`VitalConnectAI-Certificate-${(donorName || 'Donor').replace(/\s+/g, '_')}.pdf`);
}