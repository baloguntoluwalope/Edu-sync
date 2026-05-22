export const NIGERIAN_CURRICULUM = {
  KINDERGARTEN_NURSERY: [
    'Numeracy', 'Literacy', 'Basic Science/Nature Study', 'Health Education',
    'Social Norms', 'Creative Arts/Coloring', 'Rhymes/Poetry', 'Handwriting',
    'Christian Religious Studies', 'Islamic Religious Studies'
  ],
  PRIMARY_SCHOOL: [
    'English Language', 'Mathematics', 'Basic Science and Technology',
    'Social Studies', 'Civic Education', 'Agricultural Science', 'Home Economics', 
    'Cultural and Creative Arts', 'Physical and Health Education (PHE)',
    'Computer Studies (ICT)', 'Christian Religious Studies', 'Islamic Religious Studies',
    'Yoruba', 'Igbo', 'Hausa', 'French Language'
  ],
  JUNIOR_SECONDARY: [
    'English Language', 'Mathematics', 'Basic Science', 'Social Studies',
    'Civic Education', 'Agricultural Science', 'Home Economics',
    'Business Studies', 'Basic Technology', 'Cultural and Creative Arts',
    'Physical and Health Education (PHE)', 'Computer Studies (ICT)',
    'Christian Religious Studies', 'Islamic Religious Studies',
    'French Language', 'Yoruba', 'Igbo', 'Hausa'
  ],
  SENIOR_SECONDARY: [
    // Core Compulsory Subjects (WAEC/NECO Standard)
    'English Language', 'Mathematics', 'Civic Education', 'Economics', 'Data Processing',

    // Science Department
    'Biology', 'Chemistry', 'Physics', 'Further Mathematics', 'Geography', 'Agricultural Science',

    // Arts & Humanities Department
    'Literature in English', 'Government', 'Christian Religious Studies', 
    'Islamic Religious Studies', 'History', 'Visual Arts', 'French', 'Music',

    // Commercial Department
    'Financial Accounting', 'Commerce', 'Office Practice', 'Insurance',

    // Mandatory Trade Subjects
    'Animal Husbandry', 'Fisheries', 'Book Keeping', 'Photography', 'Cosmetology', 
    'Catering Craft Practice', 'GSM Phone Maintenance', 'Welding', 'Dyeing & Bleaching'
  ]
};

// Use this for global dropdowns
export const ALL_NIGERIAN_SUBJECTS = Array.from(
  new Set(Object.values(NIGERIAN_CURRICULUM).flat())
).sort();