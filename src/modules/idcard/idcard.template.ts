import { IIDCardItem } from '../../shared/models/IDCardOrder';

interface SchoolBranding {
  schoolName: string;
  branchName: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  principalName?: string;
  principalSignatureUrl?: string;
  primaryColor?: string;
  session: string;
}

const getRoleLabel = (type: string, role?: string): string => {
  const map: Record<string, string> = {
    student: 'STUDENT',
    teacher: 'TEACHER',
    admin: 'ADMINISTRATOR',
    staff: role ? role.replace(/_/g, ' ').toUpperCase() : 'STAFF',
  };
  return map[type] || type.toUpperCase();
};

const getBadgeColor = (type: string): string => {
  const map: Record<string, string> = {
    student: '#16a34a',
    teacher: '#1d4ed8',
    admin: '#7c3aed',
    staff: '#b45309',
  };
  return map[type] || '#475569';
};

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE CARD PAIR — FRONT + BACK
// ─────────────────────────────────────────────────────────────────────────────
const buildCardPairHTML = (item: IIDCardItem, branding: SchoolBranding): string => {
  const primary = branding.primaryColor || '#1a56db';
  const darker = '#0c2d6b';
  const badge = getBadgeColor(item.attendeeType);
  const role = getRoleLabel(item.attendeeType, item.role);
  const [firstName = '', ...rest] = item.name.trim().split(' ');
  const lastName = rest.join(' ');

  // ── FRONT ─────────────────────────────────────────────────────────────────
  const front = `
<div class="card front">

  <div class="card-header" style="background:linear-gradient(135deg,${primary} 0%,${darker} 100%);">
    <div class="header-left">
      ${branding.logoUrl
        ? `<img src="${branding.logoUrl}" class="school-logo" alt="logo"/>`
        : `<div class="logo-box" style="background:rgba(255,255,255,0.15);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
           </div>`
      }
      <div class="school-text">
        <div class="school-name">${branding.schoolName}</div>
        <div class="branch-name">${branding.branchName}</div>
      </div>
    </div>
    <div class="badge" style="background:${badge};">${role}</div>
  </div>

  <div class="card-body">
    <div class="photo-wrap">
      ${item.passportUrl
        ? `<img src="${item.passportUrl}" class="photo" alt="photo"/>`
        : `<div class="photo-placeholder">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>PHOTO</span>
           </div>`
      }
      <div class="photo-accent" style="background:${primary};"></div>
    </div>

    <div class="info-wrap">
      <div class="name-block">
        <div class="name-last">${lastName.toUpperCase() || firstName.toUpperCase()}</div>
        <div class="name-first">${lastName ? firstName : ''}</div>
      </div>
      <div class="name-divider" style="background:${badge};"></div>
      <div class="info-rows">
        ${item.className
          ? `<div class="irow"><span class="ik">Class</span><span class="iv">${item.className}</span></div>`
          : ''}
        <div class="irow">
          <span class="ik">${item.attendeeType === 'student' ? 'Reg No' : 'Staff ID'}</span>
          <span class="iv mono">${item.identifier}</span>
        </div>
        <div class="irow"><span class="ik">Session</span><span class="iv">${branding.session}</span></div>
      </div>
    </div>
  </div>

  <div class="card-footer" style="background:${primary};">
    <span>${branding.address}</span>
  </div>

</div>`;

  // ── BACK ──────────────────────────────────────────────────────────────────
  const back = `
<div class="card back">

  <div class="card-header back-header" style="background:linear-gradient(135deg,${primary} 0%,${darker} 100%);">
    <div class="back-title">IDENTIFICATION CARD</div>
    <div class="back-subtitle">${branding.session} Academic Session</div>
  </div>

  <div class="card-body back-body">

    <div class="qr-wrap">
      <div class="qr-box">
        <img src="${item.qrCodeUrl}" class="qr" alt="QR Code"/>
      </div>
      <div class="qr-label">Scan for Attendance</div>
      <div class="qr-id">${item.identifier}</div>
    </div>

    <div class="right-wrap">
      <div class="contacts">
        ${branding.phone ? `
        <div class="crow">
          <svg class="cicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.89 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          <span class="ctext">${branding.phone}</span>
        </div>` : ''}

        ${branding.email ? `
        <div class="crow">
          <svg class="cicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <span class="ctext">${branding.email}</span>
        </div>` : ''}

        ${branding.website ? `
        <div class="crow">
          <svg class="cicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span class="ctext">${branding.website}</span>
        </div>` : ''}
      </div>

      ${branding.principalSignatureUrl || branding.principalName ? `
      <div class="sig-wrap">
        ${branding.principalSignatureUrl
          ? `<img src="${branding.principalSignatureUrl}" class="sig-img" alt="sig"/>`
          : '<div style="height:20px;"></div>'
        }
        <div class="sig-line" style="border-color:${primary};"></div>
        <div class="sig-name">${branding.principalName || 'Principal'}</div>
        <div class="sig-role">Principal / Head Teacher</div>
      </div>` : ''}
    </div>

  </div>

  <div class="card-footer" style="background:${primary};">
    <span>If found, please return to ${branding.schoolName}</span>
  </div>

</div>`;

  return `<div class="card-pair">${front}${back}</div>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// FULL PAGE
// ─────────────────────────────────────────────────────────────────────────────
export const buildIDCardPageHTML = (
  items: IIDCardItem[],
  branding: SchoolBranding
): string => {
  const primary = branding.primaryColor || '#1a56db';
  const cards = items.map((i) => buildCardPairHTML(i, branding)).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>ID Cards — ${branding.schoolName}</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

    body{
      font-family:'Helvetica Neue',Arial,sans-serif;
      background:#e5e7eb;
      padding:24px;
      color:#1e293b;
    }

    /* ─── PAGE HEADER ───────── */
    .ph{
      background:white;border-radius:8px;padding:14px 20px;
      margin-bottom:24px;text-align:center;
      box-shadow:0 2px 8px rgba(0,0,0,.08);
    }
    .ph h1{font-size:16px;color:#1e293b;margin-bottom:3px;}
    .ph p{font-size:11px;color:#64748b;}

    /* ─── GRID ──────────────── */
    .grid{display:flex;flex-wrap:wrap;gap:18px;}

    /* ─── PAIR ──────────────── */
    .card-pair{display:flex;gap:10px;page-break-inside:avoid;break-inside:avoid;}

    /* ─── CARD ──────────────── */
    .card{
      width:308px;height:194px;
      border-radius:11px;overflow:hidden;
      display:flex;flex-direction:column;
      background:#fff;
      box-shadow:0 4px 18px rgba(0,0,0,.16);
    }

    /* ─── HEADER ────────────── */
    .card-header{
      display:flex;align-items:center;justify-content:space-between;
      padding:7px 10px;flex-shrink:0;min-height:46px;
    }
    .header-left{display:flex;align-items:center;gap:7px;flex:1;overflow:hidden;}
    .school-logo{
      width:30px;height:30px;object-fit:contain;
      border-radius:4px;background:white;padding:2px;flex-shrink:0;
    }
    .logo-box{
      width:30px;height:30px;border-radius:4px;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
    }
    .school-text{flex:1;overflow:hidden;}
    .school-name{
      font-size:9px;font-weight:800;color:white;
      text-transform:uppercase;letter-spacing:.3px;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .branch-name{font-size:7px;color:rgba(255,255,255,.78);}
    .badge{
      flex-shrink:0;padding:2px 8px;border-radius:20px;
      font-size:6.5px;font-weight:800;color:white;
      letter-spacing:.5px;margin-left:6px;
    }

    /* ─── BODY ──────────────── */
    .card-body{flex:1;display:flex;padding:8px 10px;gap:8px;overflow:hidden;}

    /* ─── PHOTO ─────────────── */
    .photo-wrap{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4px;}
    .photo{
      width:66px;height:80px;object-fit:cover;
      border-radius:6px;border:2.5px solid #e2e8f0;
    }
    .photo-placeholder{
      width:66px;height:80px;border-radius:6px;
      background:#f1f5f9;border:2px dashed #cbd5e1;
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
    }
    .photo-placeholder span{font-size:6.5px;color:#94a3b8;font-weight:700;letter-spacing:.5px;}
    .photo-accent{width:4px;height:36px;border-radius:2px;opacity:.55;}

    /* ─── INFO ──────────────── */
    .info-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;}
    .name-block{margin-bottom:4px;}
    .name-last{font-size:13px;font-weight:900;color:#0f172a;letter-spacing:.2px;line-height:1.2;}
    .name-first{font-size:10px;font-weight:600;color:#334155;}
    .name-divider{width:36px;height:2.5px;border-radius:2px;margin:5px 0;opacity:.7;}
    .info-rows{display:flex;flex-direction:column;gap:2.5px;}
    .irow{display:flex;align-items:baseline;gap:4px;}
    .ik{font-size:7px;color:#94a3b8;min-width:42px;flex-shrink:0;}
    .iv{font-size:8.5px;color:#1e293b;font-weight:700;}
    .mono{font-family:'Courier New',monospace;font-size:8px;letter-spacing:.5px;}

    /* ─── FOOTER ────────────── */
    .card-footer{
      padding:3.5px 10px;flex-shrink:0;
    }
    .card-footer span{
      font-size:6.5px;color:rgba(255,255,255,.85);
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;
    }

    /* ─── BACK ──────────────── */
    .back-header{
      flex-direction:column;justify-content:center;
      text-align:center;gap:1px;
    }
    .back-title{font-size:8.5px;font-weight:900;color:white;letter-spacing:1.5px;}
    .back-subtitle{font-size:7px;color:rgba(255,255,255,.75);}
    .back-body{align-items:flex-start;}

    /* ─── QR ─────────────────── */
    .qr-wrap{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px;}
    .qr-box{
      padding:4px;background:white;
      border:2px solid #f1f5f9;border-radius:6px;
    }
    .qr{width:84px;height:84px;object-fit:contain;display:block;}
    .qr-label{font-size:6.5px;color:#64748b;text-align:center;}
    .qr-id{font-size:7px;font-family:'Courier New',monospace;font-weight:700;color:#1e293b;letter-spacing:.4px;}

    /* ─── CONTACTS ───────────── */
    .right-wrap{flex:1;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;}
    .contacts{display:flex;flex-direction:column;gap:3.5px;}
    .crow{display:flex;align-items:center;gap:4px;}
    .cicon{width:9px;height:9px;color:#64748b;flex-shrink:0;}
    .ctext{font-size:7px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

    /* ─── SIGNATURE ──────────── */
    .sig-wrap{display:flex;flex-direction:column;align-items:flex-start;margin-top:4px;}
    .sig-img{height:20px;object-fit:contain;max-width:85px;display:block;}
    .sig-line{width:80px;border-top:1px solid;margin:2px 0;opacity:.5;}
    .sig-name{font-size:6.5px;font-weight:700;color:#1e293b;}
    .sig-role{font-size:6px;color:#64748b;}

    /* ─── PRINT ──────────────── */
    @media print{
      body{background:white;padding:5mm;}
      .ph{display:none;}
      .grid{gap:5mm;}
      .card-pair{page-break-inside:avoid;break-inside:avoid;}
      .card{
        width:85.6mm;height:54mm;
        box-shadow:none;border:.5pt solid #e2e8f0;
        border-radius:3mm;
      }
    }
  </style>
</head>
<body>
  <div class="ph">
    <h1>ID Cards — ${branding.schoolName} &middot; ${branding.branchName}</h1>
    <p>${items.length} card(s) &middot; ${branding.session} &middot; ${new Date().toLocaleDateString('en-NG',{day:'2-digit',month:'long',year:'numeric'})}</p>
  </div>
  <div class="grid">${cards}</div>
</body>
</html>`;
};

// import { IBranch } from '../../shared/models/Branch';
// import { IIDCardItem } from '../../shared/models/IDCardOrder';

// interface SchoolBranding {
//   schoolName: string;
//   branchName: string;
//   address: string;
//   phone: string;
//   email: string;
//   logoUrl?: string;
//   principalName?: string;
//   principalSignatureUrl?: string;
//   primaryColor?: string;
//   website?: string;
//   session: string;
// }

// const CARD_WIDTH = 320;
// const CARD_HEIGHT = 200;

// const getRoleLabel = (type: string, role?: string): string => {
//   const labels: Record<string, string> = {
//     student: 'STUDENT',
//     teacher: 'TEACHER',
//     admin: 'ADMINISTRATOR',
//     staff: role ? role.replace(/_/g, ' ').toUpperCase() : 'STAFF',
//   };
//   return labels[type] || type.toUpperCase();
// };

// const getRoleBadgeColor = (type: string): string => {
//   const colors: Record<string, string> = {
//     student: '#16a34a',
//     teacher: '#1a56db',
//     admin: '#7c3aed',
//     staff: '#b45309',
//   };
//   return colors[type] || '#475569';
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // SINGLE CARD HTML (front + back side by side for one person)
// // ─────────────────────────────────────────────────────────────────────────────
// export const buildSingleCardHTML = (
//   item: IIDCardItem,
//   branding: SchoolBranding
// ): string => {
//   const roleLabel = getRoleLabel(item.attendeeType, item.role);
//   const badgeColor = getRoleBadgeColor(item.attendeeType);
//   const primaryColor = branding.primaryColor || '#1a56db';
//   const darkerColor = '#0f3a8a';
//   const nameParts = item.name.split(' ');
//   const firstName = nameParts[0] || '';
//   const lastName = nameParts.slice(1).join(' ') || '';

//   return `
//     <div class="card-pair">

//       <!-- ═══════════════ FRONT ═══════════════ -->
//       <div class="card front">

//         <!-- Top stripe with school logo + name -->
//         <div class="front-header" style="background: linear-gradient(135deg, ${primaryColor} 0%, ${darkerColor} 100%);">
//           <div class="front-header-inner">
//             ${branding.logoUrl
//       ? `<img src="${branding.logoUrl}" class="school-logo" alt="Logo"/>`
//       : `<div class="school-logo-placeholder" style="background:rgba(255,255,255,0.2);">
//                   <span style="color:white;font-size:8px;font-weight:700;">LOGO</span>
//                 </div>`
//     }
//             <div class="school-title">
//               <div class="school-name">${branding.schoolName}</div>
//               <div class="branch-name">${branding.branchName}</div>
//             </div>
//           </div>
//           <div class="role-badge" style="background:${badgeColor};">
//             ${roleLabel}
//           </div>
//         </div>

//         <!-- Body -->
//         <div class="front-body">

//           <!-- Passport photo -->
//           <div class="passport-area">
//             ${item.passportUrl
//       ? `<img src="${item.passportUrl}" class="passport-photo" alt="Photo"/>`
//       : `<div class="passport-placeholder">
//                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" width="30" height="30">
//                     <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
//                     <circle cx="12" cy="7" r="4"/>
//                   </svg>
//                 </div>`
//     }
//           </div>

//           <!-- Name + details -->
//           <div class="details-area">
//             <div class="full-name">
//               <span class="first-name">${firstName}</span>
//               <span class="last-name">${lastName.toUpperCase()}</span>
//             </div>

//             ${item.className
//       ? `<div class="detail-row">
//                   <span class="detail-label">Class:</span>
//                   <span class="detail-value">${item.className}</span>
//                 </div>`
//       : ''
//     }

//             <div class="detail-row">
//               <span class="detail-label">${item.attendeeType === 'student' ? 'Reg. No:' : 'Staff ID:'}</span>
//               <span class="detail-value id-value">${item.identifier}</span>
//             </div>

//             <div class="detail-row">
//               <span class="detail-label">Session:</span>
//               <span class="detail-value">${branding.session}</span>
//             </div>

//             <div class="detail-row">
//               <span class="detail-label">Role:</span>
//               <span class="detail-value" style="color:${badgeColor};font-weight:700;">${roleLabel}</span>
//             </div>
//           </div>

//         </div>

//         <!-- Bottom strip -->
//         <div class="front-footer" style="background:${primaryColor};">
//           <span>${branding.address}</span>
//         </div>

//       </div>

//       <!-- ═══════════════ BACK ═══════════════ -->
//       <div class="card back">

//         <!-- Back header -->
//         <div class="back-header" style="background: linear-gradient(135deg, ${primaryColor} 0%, ${darkerColor} 100%);">
//           <div class="back-title">IDENTIFICATION CARD</div>
//           <div class="back-subtitle">${branding.session} Academic Session</div>
//         </div>

//         <!-- QR Code section -->
//         <div class="back-body">

//           <div class="qr-section">
//             <img src="${item.qrCodeUrl}" class="qr-code" alt="QR Code"/>
//             <div class="qr-label">Scan for Attendance</div>
//             <div class="qr-id">${item.identifier}</div>
//           </div>

//           <!-- School contact -->
//           <div class="contact-section">
//             <div class="contact-row">
//               <span class="contact-icon">📍</span>
//               <span class="contact-text">${branding.address}</span>
//             </div>
//             ${branding.phone
//       ? `<div class="contact-row">
//                   <span class="contact-icon">📞</span>
//                   <span class="contact-text">${branding.phone}</span>
//                 </div>`
//       : ''
//     }
//             ${branding.email
//       ? `<div class="contact-row">
//                   <span class="contact-icon">✉️</span>
//                   <span class="contact-text">${branding.email}</span>
//                 </div>`
//       : ''
//     }
//             ${branding.website
//       ? `<div class="contact-row">
//                   <span class="contact-icon">🌐</span>
//                   <span class="contact-text">${branding.website}</span>
//                 </div>`
//       : ''
//     }
//           </div>

//           <!-- Principal signature -->
//           ${branding.principalSignatureUrl || branding.principalName
//       ? `<div class="signature-section">
//                 <div class="signature-line-container">
//                   ${branding.principalSignatureUrl
//         ? `<img src="${branding.principalSignatureUrl}" class="signature-img" alt="Signature"/>`
//         : '<div style="height:24px;"></div>'
//       }
//                   <div class="signature-underline"></div>
//                   <div class="signature-name">${branding.principalName || 'Principal'}</div>
//                   <div class="signature-title">Principal / Head Teacher</div>
//                 </div>
//               </div>`
//       : ''
//     }

//         </div>

//         <!-- Back footer -->
//         <div class="back-footer" style="background:${primaryColor};">
//           <span>If found, please return to the school. This card is property of ${branding.schoolName}.</span>
//         </div>

//       </div>
//     </div>
//   `;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // FULL PAGE HTML — All cards for print
// // ─────────────────────────────────────────────────────────────────────────────
// export const buildIDCardPageHTML = (
//   items: IIDCardItem[],
//   branding: SchoolBranding
// ): string => {
//   const cardsHTML = items
//     .map((item) => buildSingleCardHTML(item, branding))
//     .join('\n');

//   return `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8"/>
//   <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
//   <title>ID Cards — ${branding.schoolName}</title>
//   <style>
//     * { margin: 0; padding: 0; box-sizing: border-box; }

//     body {
//       font-family: 'Helvetica Neue', Arial, sans-serif;
//       background: #e5e7eb;
//       padding: 20px;
//     }

//     .print-header {
//       text-align: center;
//       margin-bottom: 24px;
//       background: white;
//       padding: 16px;
//       border-radius: 8px;
//       box-shadow: 0 2px 8px rgba(0,0,0,0.1);
//     }

//     .print-header h1 {
//       font-size: 18px;
//       color: #1e293b;
//       margin-bottom: 4px;
//     }

//     .print-header p {
//       color: #64748b;
//       font-size: 13px;
//     }

//     /* ── CARD GRID ─────────────────────────────── */
//     .cards-grid {
//       display: flex;
//       flex-wrap: wrap;
//       gap: 16px;
//       justify-content: flex-start;
//     }

//     /* ── CARD PAIR (front + back) ──────────────── */
//     .card-pair {
//       display: flex;
//       gap: 8px;
//       page-break-inside: avoid;
//       break-inside: avoid;
//       margin-bottom: 8px;
//     }

//     /* ── SINGLE CARD ───────────────────────────── */
//     .card {
//       width: ${CARD_WIDTH}px;
//       height: ${CARD_HEIGHT}px;
//       border-radius: 12px;
//       overflow: hidden;
//       box-shadow: 0 4px 16px rgba(0,0,0,0.15);
//       background: #ffffff;
//       display: flex;
//       flex-direction: column;
//       position: relative;
//     }

//     /* ── FRONT CARD ────────────────────────────── */
//     .front-header {
//       padding: 8px 10px 6px;
//       position: relative;
//     }

//     .front-header-inner {
//       display: flex;
//       align-items: center;
//       gap: 8px;
//     }

//     .school-logo {
//       width: 36px;
//       height: 36px;
//       object-fit: contain;
//       border-radius: 4px;
//       background: white;
//       padding: 2px;
//     }

//     .school-logo-placeholder {
//       width: 36px;
//       height: 36px;
//       border-radius: 4px;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//     }

//     .school-title {
//       flex: 1;
//     }

//     .school-name {
//       font-size: 10px;
//       font-weight: 800;
//       color: white;
//       text-transform: uppercase;
//       letter-spacing: 0.3px;
//       line-height: 1.2;
//     }

//     .branch-name {
//       font-size: 8px;
//       color: rgba(255,255,255,0.85);
//     }

//     .role-badge {
//       position: absolute;
//       top: 6px;
//       right: 8px;
//       padding: 2px 8px;
//       border-radius: 20px;
//       font-size: 7px;
//       font-weight: 800;
//       color: white;
//       letter-spacing: 0.5px;
//     }

//     .front-body {
//       flex: 1;
//       display: flex;
//       gap: 8px;
//       padding: 8px 10px;
//       align-items: flex-start;
//     }

//     .passport-area {
//       flex-shrink: 0;
//     }

//     .passport-photo {
//       width: 72px;
//       height: 86px;
//       object-fit: cover;
//       border-radius: 6px;
//       border: 2px solid #e2e8f0;
//     }

//     .passport-placeholder {
//       width: 72px;
//       height: 86px;
//       border-radius: 6px;
//       background: #f1f5f9;
//       border: 2px dashed #cbd5e1;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//     }

//     .details-area {
//       flex: 1;
//       display: flex;
//       flex-direction: column;
//       gap: 3px;
//     }

//     .full-name {
//       font-size: 12px;
//       font-weight: 800;
//       color: #1e293b;
//       line-height: 1.3;
//       margin-bottom: 4px;
//     }

//     .first-name {
//       display: block;
//     }

//     .last-name {
//       display: block;
//       font-size: 13px;
//     }

//     .detail-row {
//       display: flex;
//       align-items: center;
//       gap: 4px;
//     }

//     .detail-label {
//       font-size: 8px;
//       color: #94a3b8;
//       white-space: nowrap;
//       min-width: 48px;
//     }

//     .detail-value {
//       font-size: 9px;
//       color: #1e293b;
//       font-weight: 600;
//     }

//     .id-value {
//       font-family: monospace;
//       font-size: 9px;
//       letter-spacing: 0.5px;
//     }

//     .front-footer {
//       padding: 4px 10px;
//       font-size: 7px;
//       color: rgba(255,255,255,0.9);
//       text-align: center;
//       white-space: nowrap;
//       overflow: hidden;
//       text-overflow: ellipsis;
//     }

//     /* ── BACK CARD ─────────────────────────────── */
//     .back-header {
//       padding: 8px 10px 6px;
//       text-align: center;
//     }

//     .back-title {
//       font-size: 10px;
//       font-weight: 800;
//       color: white;
//       text-transform: uppercase;
//       letter-spacing: 1px;
//     }

//     .back-subtitle {
//       font-size: 8px;
//       color: rgba(255,255,255,0.8);
//     }

//     .back-body {
//       flex: 1;
//       display: flex;
//       gap: 6px;
//       padding: 6px 8px;
//       overflow: hidden;
//     }

//     .qr-section {
//       flex-shrink: 0;
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//       gap: 2px;
//     }

//     .qr-code {
//       width: 80px;
//       height: 80px;
//       object-fit: contain;
//       border: 2px solid #f1f5f9;
//       border-radius: 4px;
//       padding: 2px;
//     }

//     .qr-label {
//       font-size: 7px;
//       color: #64748b;
//       text-align: center;
//     }

//     .qr-id {
//       font-size: 7px;
//       font-family: monospace;
//       color: #1e293b;
//       font-weight: 700;
//       letter-spacing: 0.5px;
//     }

//     .contact-section {
//       flex: 1;
//       display: flex;
//       flex-direction: column;
//       gap: 3px;
//       overflow: hidden;
//     }

//     .contact-row {
//       display: flex;
//       align-items: flex-start;
//       gap: 4px;
//     }

//     .contact-icon {
//       font-size: 8px;
//       flex-shrink: 0;
//       line-height: 1.4;
//     }

//     .contact-text {
//       font-size: 7.5px;
//       color: #374151;
//       line-height: 1.4;
//       overflow: hidden;
//       text-overflow: ellipsis;
//       white-space: nowrap;
//     }

//     .signature-section {
//       margin-top: auto;
//     }

//     .signature-line-container {
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//     }

//     .signature-img {
//       height: 24px;
//       object-fit: contain;
//       max-width: 100px;
//     }

//     .signature-underline {
//       width: 90px;
//       border-top: 1px solid #94a3b8;
//       margin: 1px 0;
//     }

//     .signature-name {
//       font-size: 7px;
//       font-weight: 700;
//       color: #1e293b;
//       text-align: center;
//     }

//     .signature-title {
//       font-size: 6px;
//       color: #64748b;
//       text-align: center;
//     }

//     .back-footer {
//       padding: 4px 8px;
//       font-size: 6.5px;
//       color: rgba(255,255,255,0.85);
//       text-align: center;
//       line-height: 1.3;
//     }

//     /* ── PRINT STYLES ──────────────────────────── */
//     @media print {
//       body {
//         background: white;
//         padding: 0;
//       }

//       .print-header {
//         display: none;
//       }

//       .cards-grid {
//         gap: 6mm;
//       }

//       .card-pair {
//         page-break-inside: avoid;
//         break-inside: avoid;
//       }

//       .card {
//         box-shadow: none;
//         border: 1px solid #e2e8f0;
//       }

//       /* CR80 standard card size: 85.6mm × 54mm */
//       .card {
//         width: 85.6mm;
//         height: 54mm;
//       }
//     }
//   </style>
// </head>
// <body>
//   <div class="print-header">
//     <h1>ID Cards — ${branding.schoolName} · ${branding.branchName}</h1>
//     <p>${items.length} card(s) · ${branding.session} Academic Session · Generated ${new Date().toLocaleDateString('en-NG')}</p>
//   </div>

//   <div class="cards-grid">
//     ${cardsHTML}
//   </div>
// </body>
// </html>
//   `;
// };