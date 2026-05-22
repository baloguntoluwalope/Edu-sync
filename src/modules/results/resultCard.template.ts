import { IResult } from '../../shared/models/Result';

/** * HELPER UTILITIES 
 */
const ordinal = (n: number | string): string => {
  const num = typeof n === 'string' ? parseInt(n) : n;
  if (!num) return '-';
  if (num === 1) return '1st';
  if (num === 2) return '2nd';
  if (num === 3) return '3rd';
  return `${num}th`;
};

const termLabel = (term: string) => {
  const t = term?.toLowerCase();
  if (t === 'first') return '1st';
  if (t === 'second') return '2nd';
  if (t === 'third') return '3rd';
  return term;
};

export const buildResultCardHTML = (
  result: IResult,
  subjectNames: Record<string, string>
): string => {
  
  // 1. Process Subject Scores
  const scores = result.scores instanceof Map
    ? Array.from(result.scores.entries())
    : Object.entries(result.scores || {});

  const subjectRows = scores
    .map(([subjectId, score]: [string, any]) => {
      const name = subjectNames[subjectId] || subjectId;
      const remarkSlug = (score.remark || '').toLowerCase().replace(/\s/g, '-');
      
      return `
        <tr>
          <td class="subject-name">${name}</td>
          <td class="center">${score.ca1 ?? '-'}</td>
          <td class="center">${score.ca2 ?? '-'}</td>
          <td class="center">${score.exam ?? '-'}</td>
          <td class="center bold">${score.termTotal ?? '-'}</td>
          <td class="center bold grade">${score.grade ?? '-'}</td>
          <td class="center">${score.subjectPosition ? ordinal(score.subjectPosition) : '-'}</td>
          <td class="center">${score.classAverage?.toFixed(1) ?? '-'}</td>
          <td class="center">${score.weightedScore ?? score.cumulativeAverage ?? '-'}</td>
          <td class="center remark-${remarkSlug}">${score.remark ?? '-'}</td>
        </tr>`;
    })
    .join('');

  // 2. Safely access traits
  const af = (result.affectiveDomain || {}) as any;
  const ps = (result.psychomotor || {}) as any;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Result Card — ${result.studentName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 15px; }

    /* ── HEADER ── */
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1a6b3c; padding-bottom: 10px; margin-bottom: 8px; }
    .header-logo { width: 85px; height: 85px; object-fit: contain; }
    .header-passport { width: 90px; height: 100px; object-fit: cover; border: 2px solid #1a6b3c; background: #f0f0f0; }
    .header-center { flex: 1; text-align: center; padding: 0 15px; }
    .school-name { font-size: 22px; font-weight: 900; color: #1a6b3c; text-transform: uppercase; }
    .school-motto { font-size: 11px; font-style: italic; color: #444; margin: 3px 0; }
    .school-info { font-size: 10px; color: #555; line-height: 1.5; }

    /* ── TABLES ── */
    .exam-title { text-align: center; font-weight: bold; font-size: 13px; text-transform: uppercase; text-decoration: underline; margin: 8px 0; color: #1a6b3c; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
    td, th { border: 1px solid #999; padding: 4px 6px; font-size: 10px; }
    .info-label { font-weight: bold; color: #222; background: #f4f4f4; white-space: nowrap; }
    .center { text-align: center; }
    .bold { font-weight: bold; }

    .result-table th { background: #1a6b3c; color: #fff; font-size: 9px; padding: 6px 3px; }
    .result-table tr:nth-child(even) td { background: #f8fff8; }
    .grade { color: #1a6b3c; font-weight: bold; }

    /* ── BOTTOM SECTIONS ── */
    .bottom-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 10px; }
    .section-title { background: #1a6b3c; color: #fff; padding: 5px; font-weight: bold; font-size: 10px; text-transform: uppercase; text-align: center; margin-bottom: 2px; }
    .trait-table td:last-child { text-align: center; font-weight: bold; color: #1a6b3c; width: 40px; border-left: 2px solid #eee; }

    /* ── SIGNATURE & FOOTER ── */
    .comments-table td { vertical-align: top; padding: 6px; }
    .footer-area { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 15px; }
    .signature-block { text-align: center; width: 200px; }
    .signature-img { height: 55px; max-width: 160px; object-fit: contain; display: block; margin: 0 auto; }
    .signature-line { border-top: 1px solid #222; margin: 4px 0; }
    .footer-note { font-size: 9px; color: #777; border-top: 1px solid #eee; padding-top: 5px; text-align: center; margin-top: 15px; }

    @media print { body { padding: 0; } @page { margin: 1cm; } }
  </style>
</head>
<body>

  <div class="header">
    <img src="${result.schoolLogoUrl || ''}" class="header-logo" alt="School Logo" />
    <div class="header-center">
      <div class="school-name">${result.schoolName || 'EduSync Academy'}</div>
      <div class="school-motto">"Excellence in Learning"</div>
      <div class="school-info">
        ${result.schoolAddress || ''}<br/>
        Tel: ${result.schoolPhone || ''} | Email: ${result.schoolEmail || ''}
      </div>
    </div>
    <img src="${result.studentPassportUrl || ''}" class="header-passport" alt="Student Photo" />
  </div>

  <div class="exam-title">
    ${termLabel(result.term)} Term Report Sheet — ${result.session} Academic Session
  </div>

  <table>
    <tr>
      <td class="info-label">Name of Student</td><td colspan="3" class="bold">${result.studentName?.toUpperCase()}</td>
      <td class="info-label">Admission No.</td><td class="bold">${result.admissionNumber || '-'}</td>
    </tr>
    <tr>
      <td class="info-label">Class</td><td>${result.className}</td>
      <td class="info-label">Gender</td><td>${result.studentGender || '-'}</td>
      <td class="info-label">Age</td><td>${result.studentAge ? result.studentAge + ' yrs' : '-'}</td>
    </tr>
    <tr>
      <td class="info-label">Position</td><td class="bold">${result.positionInClass ? ordinal(result.positionInClass) : '-'}</td>
      <td class="info-label">No. in Class</td><td>${result.totalStudentsInClass || '-'}</td>
      <td class="info-label">Average</td><td class="bold">${result.averageScore?.toFixed(2) || '-'}</td>
    </tr>
  </table>

  <table class="result-table">
    <thead>
      <tr>
        <th style="text-align:left; width:22%;">SUBJECT</th>
        <th>CA 1</th><th>CA 2</th><th>EXAM</th><th>TOTAL</th>
        <th>GRADE</th><th>POS</th><th>CLASS AVG</th><th>CUMUL.</th><th>REMARK</th>
      </tr>
    </thead>
    <tbody>
      ${subjectRows}
    </tbody>
  </table>

  <div class="bottom-grid">
    <div>
      <div class="section-title">Affective Traits</div>
      <table class="trait-table">
        <tr><td>Punctuality</td><td>${af.punctuality ?? '-'}</td></tr>
        <tr><td>Neatness</td><td>${af.neatness ?? '-'}</td></tr>
        <tr><td>Honesty</td><td>${af.honesty ?? '-'}</td></tr>
        <tr><td>Behavior</td><td>${af.behavior ?? '-'}</td></tr>
        <tr><td>Reliability</td><td>${af.reliability ?? '-'}</td></tr>
        <tr><td>Attentiveness</td><td>${af.attentiveness ?? '-'}</td></tr>
        <tr><td>Self-Control</td><td>${af.selfControl ?? '-'}</td></tr>
        <tr><td>Teamwork</td><td>${af.spiritOfTeamwork ?? '-'}</td></tr>
      </table>
    </div>

    <div>
      <div class="section-title">Psychomotor Skills</div>
      <table class="trait-table">
        <tr><td>Handwriting</td><td>${ps.handwriting ?? '-'}</td></tr>
        <tr><td>Reading</td><td>${ps.reading ?? '-'}</td></tr>
        <tr><td>Diction/Fluency</td><td>${ps.verbalFluencyDiction ?? '-'}</td></tr>
        <tr><td>Creative Arts</td><td>${ps.creativeArts ?? '-'}</td></tr>
        <tr><td>Sports/P.E</td><td>${ps.physicalEducation ?? '-'}</td></tr>
        <tr><td>Musical Skills</td><td>${ps.musicalSkills ?? '-'}</td></tr>
        <tr><td>Reasoning</td><td>${ps.generalReasoning ?? '-'}</td></tr>
      </table>
    </div>

    <div>
      <div class="section-title">Grading Scale</div>
      <table style="font-size: 8px;">
        <tr class="info-label"><td colspan="2">Score Range</td><td>Grade</td></tr>
        <tr><td>75 - 100</td><td>A1</td><td>Excellent</td></tr>
        <tr><td>70 - 74</td><td>B2</td><td>Very Good</td></tr>
        <tr><td>65 - 69</td><td>B3</td><td>Good</td></tr>
        <tr><td>55 - 64</td><td>C4-C6</td><td>Credit</td></tr>
        <tr><td>40 - 54</td><td>D7-E8</td><td>Pass</td></tr>
        <tr><td>0 - 39</td><td>F9</td><td>Fail</td></tr>
      </table>
    </div>
  </div>

  <table class="comments-table" style="margin-top:10px;">
    <tr><td class="info-label" style="width:20%">Class Teacher</td><td>${result.formMasterComment || 'No comment provided.'}</td></tr>
    <tr><td class="info-label">Principal</td><td>${result.principalComment || 'No comment provided.'}</td></tr>
  </table>

  <div class="footer-area">
    <div style="font-size: 9px; line-height: 1.6;">
      <strong>Next Term Begins:</strong> ${result.nextTermBegins || 'N/A'}<br/>
      <strong>Term Ended:</strong> ${result.termEndDate || 'N/A'}<br/>
      <strong>Attendance:</strong> ${result.daysPresent || '0'} / ${result.daysSchoolOpened || '0'} Days
    </div>

    <div class="signature-block">
      <img src="${result.principalSignatureUrl || ''}" class="signature-img" alt="Principal Signature" />
      <div class="signature-line"></div>
      <div class="bold">${result.principalName || 'School Principal'}</div>
      <div style="font-size: 9px; color: #444;">Principal's Signature & Stamp</div>
    </div>
  </div>

  <div class="footer-note">
    This document is an official academic record from ${result.schoolName || 'the school'}.<br/>
    Generated on ${new Date().toLocaleDateString('en-NG')}
  </div>

</body>
</html>
`;
};


// import { IResult } from '../../shared/models/Result';

// /** * HELPER UTILITIES 
//  */
// const ordinal = (n: number | string): string => {
//   const num = typeof n === 'string' ? parseInt(n) : n;
//   if (!num) return '-';
//   const s = ["th", "st", "nd", "rd"];
//   const v = num % 100;
//   return num + (s[(v - 20) % 10] || s[v] || s[0]);
// };

// const formatNumber = (val: any, decimals: number = 0): string => {
//   if (val === null || val === undefined || isNaN(val)) return '-';
//   return Number(val).toFixed(decimals);
// };

// const termLabel = (term: string) => {
//   const map: Record<string, string> = { first: '1st', second: '2nd', third: '3rd' };
//   return map[term.toLowerCase()] || term;
// };

// export const buildResultCardHTML = (
//   result: IResult,
//   subjectNames: Record<string, string>
// ): string => {
//   // Extract scores reliably
//   const scores = result.scores instanceof Map 
//     ? Array.from(result.scores.entries()) 
//     : Object.entries(result.scores || {});

//   const subjectRows = scores
//     .map(([subjectId, score]: [string, any]) => {
//       const name = subjectNames[subjectId] || subjectId;
//       const remarkClass = `remark-${(score.remark || '').toLowerCase().replace(/\s/g, '-')}`;
      
//       return `
//         <tr>
//           <td class="subject-name">${name}</td>
//           <td class="center">${score.ca1 ?? '-'}</td>
//           <td class="center">${score.ca2 ?? '-'}</td>
//           <td class="center">${score.exam ?? '-'}</td>
//           <td class="center bold">${score.termTotal ?? '-'}</td>
//           <td class="center bold grade">${score.grade ?? '-'}</td>
//           <td class="center">${score.subjectPosition ? ordinal(score.subjectPosition) : '-'}</td>
//           <td class="center">${formatNumber(score.classAverage, 1)}</td>
//           <td class="center">${score.weightedScore ?? score.cumulativeAverage ?? '-'}</td>
//           <td class="center ${remarkClass}">${score.remark ?? '-'}</td>
//         </tr>`;
//     })
//     .join('');

//   const af = (result.affectiveDomain || {}) as any;
//   const ps = (result.psychomotor || {}) as any;

//   return `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8"/>
//   <style>
//     body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; color: #111; padding: 10px; line-height: 1.2; }
    
//     /* HEADER SECTION */
//     .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1a6b3c; padding-bottom: 10px; margin-bottom: 10px; }
//     .header-img-container { width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; background: #f9f9f9; border: 1px hide #eee; }
//     .header-logo { max-width: 90px; max-height: 90px; object-fit: contain; }
//     .header-passport { width: 90px; height: 100px; object-fit: cover; border: 2px solid #1a6b3c; }
    
//     .header-center { flex: 1; text-align: center; }
//     .school-name { font-size: 22px; font-weight: 900; color: #1a6b3c; text-transform: uppercase; margin-bottom: 2px; }
//     .school-motto { font-size: 12px; font-style: italic; color: #444; margin-bottom: 5px; }
//     .school-info { font-size: 10px; color: #555; }

//     /* TABLES */
//     table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
//     th, td { border: 1px solid #aaa; padding: 4px 6px; font-size: 10px; }
//     th { background: #1a6b3c; color: #fff; font-weight: bold; text-transform: uppercase; font-size: 9px; }
    
//     .exam-title { text-align: center; font-weight: bold; font-size: 14px; color: #1a6b3c; text-decoration: underline; margin: 10px 0; text-transform: uppercase; }
//     .info-label { font-weight: bold; background: #f2f2f2; width: 15%; }
//     .center { text-align: center; }
//     .bold { font-weight: bold; }
    
//     /* RESULTS TABLE */
//     .result-table th { padding: 8px 4px; }
//     .result-table tr:nth-child(even) { background: #f9fff9; }
//     .grade { color: #1a6b3c; }

//     /* REMARK COLORS */
//     .remark-excellent { color: #1a6b3c; }
//     .remark-fail { color: #dc2626; }

//     /* GRID FOR SKILLS */
//     .bottom-container { display: flex; gap: 10px; align-items: flex-start; }
//     .bottom-column { flex: 1; }
//     .section-header { background: #1a6b3c; color: white; padding: 4px; font-weight: bold; text-align: center; font-size: 10px; }

//     /* SIGNATURE */
//     .footer-flex { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; }
//     .signature-wrap { text-align: center; width: 200px; }
//     .sig-img { height: 50px; width: auto; max-width: 150px; display: block; margin: 0 auto 5px; }
//     .sig-line { border-top: 1px solid #000; margin-bottom: 4px; }
    
//     @media print { body { padding: 0; } .no-print { display: none; } }
//   </style>
// </head>
// <body>

//   <div class="header">
//     <div class="header-img-container">
//       ${result.schoolLogoUrl 
//         ? `<img src="${result.schoolLogoUrl}" class="header-logo" alt="Logo" crossorigin="anonymous"/>` 
//         : '<span>NO LOGO</span>'}
//     </div>

//     <div class="header-center">
//       <div class="school-name">${result.schoolName || 'SCHOOL NAME'}</div>
//       <div class="school-motto">"Knowledge is Power"</div>
//       <div class="school-info">
//         ${result.schoolAddress || ''}<br/>
//         Tel: ${result.schoolPhone || ''} | Email: ${result.schoolEmail || ''}
//       </div>
//     </div>

//     <div class="header-img-container">
//       ${result.studentPassportUrl 
//         ? `<img src="${result.studentPassportUrl}" class="header-passport" alt="Student" crossorigin="anonymous"/>` 
//         : '<span>NO PHOTO</span>'}
//     </div>
//   </div>

//   <div class="exam-title">
//     ${termLabel(result.term)} Term Report Card — ${result.session} Session
//   </div>

//   <table>
//     <tr>
//       <td class="info-label">Student Name</td>
//       <td colspan="3" class="bold">${result.studentName?.toUpperCase()}</td>
//       <td class="info-label">Reg No.</td>
//       <td class="bold">${result.admissionNumber || '-'}</td>
//     </tr>
//     <tr>
//       <td class="info-label">Class</td>
//       <td>${result.className}</td>
//       <td class="info-label">Gender</td>
//       <td>${result.studentGender || '-'}</td>
//       <td class="info-label">Position</td>
//       <td class="bold">${result.positionInClass ? ordinal(result.positionInClass) : '-'} / ${result.totalStudentsInClass || '-'}</td>
//     </tr>
//   </table>

//   <table class="result-table">
//     <thead>
//       <tr>
//         <th style="text-align:left; width: 25%;">Subject</th>
//         <th>CA 1</th>
//         <th>CA 2</th>
//         <th>Exam</th>
//         <th>Total</th>
//         <th>Grade</th>
//         <th>Pos</th>
//         <th>Avg</th>
//         <th>Cum.</th>
//         <th>Remark</th>
//       </tr>
//     </thead>
//     <tbody>
//       ${subjectRows}
//     </tbody>
//   </table>

//   <div class="bottom-container">
//     <div class="bottom-column">
//       <div class="section-header">Affective Domain</div>
//       <table>
//         <tr><td>Punctuality</td><td class="center bold">${af.punctuality || '-'}</td></tr>
//         <tr><td>Neatness</td><td class="center bold">${af.neatness || '-'}</td></tr>
//         <tr><td>Honesty</td><td class="center bold">${af.honesty || '-'}</td></tr>
//         <tr><td>Self Control</td><td class="center bold">${af.selfControl || '-'}</td></tr>
//         <tr><td>Attentiveness</td><td class="center bold">${af.attentiveness || '-'}</td></tr>
//       </table>
//     </div>

//     <div class="bottom-column">
//       <div class="section-header">Psychomotor Skills</div>
//       <table>
//         <tr><td>Handwriting</td><td class="center bold">${ps.handwriting || '-'}</td></tr>
//         <tr><td>Sports</td><td class="center bold">${ps.physicalEducation || '-'}</td></tr>
//         <tr><td>Fluency</td><td class="center bold">${ps.verbalFluencyDiction || '-'}</td></tr>
//         <tr><td>Creativity</td><td class="center bold">${ps.creativeArts || '-'}</td></tr>
//         <tr><td>Reading</td><td class="center bold">${ps.reading || '-'}</td></tr>
//       </table>
//     </div>

//     <div class="bottom-column">
//       <div class="section-header">Grading Scale</div>
//       <table style="font-size: 8px;">
//         <tr><td>75-100</td><td>A1</td><td>Excellent</td></tr>
//         <tr><td>70-74</td><td>B2</td><td>V. Good</td></tr>
//         <tr><td>65-69</td><td>B3</td><td>Good</td></tr>
//         <tr><td>50-64</td><td>C</td><td>Credit</td></tr>
//         <tr><td>0-39</td><td>F9</td><td>Fail</td></tr>
//       </table>
//     </div>
//   </div>

//   <table>
//     <tr>
//       <td class="info-label">Teacher's Comment</td>
//       <td>${result.formMasterComment || 'A good performance.'}</td>
//     </tr>
//     <tr>
//       <td class="info-label">Principal's Comment</td>
//       <td>${result.principalComment || 'Keep it up.'}</td>
//     </tr>
//   </table>

//   <div class="footer-flex">
//     <div style="font-size: 9px; color: #666;">
//       Generated on: ${new Date().toLocaleDateString()}<br/>
//       Next Term Begins: ${result.nextTermBegins || 'N/A'}
//     </div>
    
//     <div class="signature-wrap">
//       ${result.principalSignatureUrl 
//         ? `<img src="${result.principalSignatureUrl}" class="sig-img" alt="Signature" crossorigin="anonymous"/>` 
//         : '<div style="height:50px;"></div>'}
//       <div class="sig-line"></div>
//       <div class="bold">${result.principalName || 'Principal'}</div>
//       <div style="font-size: 9px;">Signature & Stamp</div>
//     </div>
//   </div>

// </body>
// </html>
// `;
// };