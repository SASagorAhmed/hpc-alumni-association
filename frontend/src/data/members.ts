export interface Member {
  id: number;
  designation: string;
  name: string;
  batch: string;
  institution: string;
  jobStatus: string;
  about: string;
  location: string;
  expertise: string;
}

export const president: Member = {
  id: 1, designation: "President", name: "Rashedul Riyaz", batch: "5th",
  institution: "University of Dhaka", jobStatus: "Business Executive",
  about: "Leading the alumni network with vision and dedication since its inception. Instrumental in founding the HPC Alumni Association.",
  location: "Dhaka, Bangladesh", expertise: "Leadership & Strategy"
};

export const officers: Member[] = [
  { id: 2, designation: "Vice President", name: "Abdullah Al Roman", batch: "5th", institution: "BUET", jobStatus: "Software Engineer", about: "Driving tech innovation and alumni collaboration across batches.", location: "Dhaka", expertise: "Software Development" },
  { id: 3, designation: "Vice President", name: "Zakir Ahmed Khan", batch: "5th", institution: "IBA, DU", jobStatus: "Entrepreneur", about: "Building bridges between alumni and industry with strategic partnerships.", location: "Dhaka", expertise: "Business & Entrepreneurship" },
  { id: 4, designation: "Vice President", name: "Nahid Hasan Litu", batch: "6th", institution: "NSU", jobStatus: "Marketing Manager", about: "Passionate about community building and alumni engagement programs.", location: "Dhaka", expertise: "Marketing & Branding" },
  { id: 5, designation: "Vice President", name: "Nahid Hasan Litu", batch: "6th", institution: "BRAC University", jobStatus: "Data Analyst", about: "Data-driven approach to alumni engagement and program evaluation.", location: "Dhaka", expertise: "Data Analytics" },
  { id: 6, designation: "মহাসচিব", name: "Taufiqul Islam", batch: "9th", institution: "Dhaka College", jobStatus: "Admin Officer", about: "Organizing and coordinating all alumni events and official communications.", location: "Dhaka", expertise: "Administration" },
  { id: 7, designation: "Treasurer", name: "Rashidul Bari", batch: "9th", institution: "Jagannath University", jobStatus: "Chartered Accountant", about: "Managing alumni finances with full transparency and accountability.", location: "Dhaka", expertise: "Finance & Accounting" },
];

export const executives: Member[] = [
  { id: 8, designation: "Joint Secretary", name: "Md. Imranul Alam Russel", batch: "6th", institution: "Stamford University", jobStatus: "Lecturer", about: "Bridging academia and alumni network.", location: "Dhaka", expertise: "Education" },
  { id: 9, designation: "Joint Secretary", name: "Md. Faisal Akhtar", batch: "6th", institution: "Eden Mohila College", jobStatus: "Senior Banker", about: "Financial sector alumni representative.", location: "Dhaka", expertise: "Banking" },
  { id: 10, designation: "Joint Secretary", name: "Abu Hanif", batch: "6th", institution: "AIUB", jobStatus: "Full-Stack Developer", about: "Tech lead for digital alumni initiatives.", location: "Dhaka", expertise: "Web Development" },
  { id: 11, designation: "Joint Secretary", name: "Omar Faruk", batch: "9th", institution: "BUBT", jobStatus: "Mechanical Engineer", about: "Connecting engineering alumni across industries.", location: "Gazipur", expertise: "Engineering" },
  { id: 12, designation: "Organizing Secretary", name: "Al-Amin Islam", batch: "6th", institution: "University of Dhaka", jobStatus: "HR Manager", about: "Organizational excellence in alumni affairs.", location: "Dhaka", expertise: "Human Resources" },
  { id: 13, designation: "Asst. Organizing Secretary", name: "Palash Sarkar", batch: "6th", institution: "RUET", jobStatus: "Civil Engineer", about: "Infrastructure and planning expert.", location: "Rajshahi", expertise: "Civil Engineering" },
  { id: 14, designation: "Asst. Organizing Secretary", name: "H. M. Fariduzzaman", batch: "6th", institution: "University of Chittagong", jobStatus: "Teacher", about: "Education sector contributor and mentor.", location: "Chittagong", expertise: "Teaching" },
  { id: 15, designation: "Asst. Organizing Secretary", name: "Shami Kibria Sagar", batch: "6th", institution: "Jahangirnagar University", jobStatus: "Journalist", about: "Media and communications lead.", location: "Savar", expertise: "Journalism" },
  { id: 16, designation: "Asst. Organizing Secretary", name: "Imran Hossain", batch: "9th", institution: "SUST", jobStatus: "Research Scientist", about: "Research and innovation advocate.", location: "Sylhet", expertise: "Research" },
  { id: 17, designation: "Literature & Publication Secretary", name: "Md. Mehedi Hasan", batch: "8th", institution: "University of Rajshahi", jobStatus: "Writer & Editor", about: "Literary and publication initiatives.", location: "Rajshahi", expertise: "Writing & Publishing" },
  { id: 18, designation: "Cultural Secretary", name: "Shah Islam Siam", batch: "9th", institution: "Khulna University", jobStatus: "Graphic Designer", about: "Cultural events and creative direction.", location: "Khulna", expertise: "Design" },
  { id: 19, designation: "Office & Information Secretary", name: "Al-Md. Mahbub Hossain", batch: "10th", institution: "UIU", jobStatus: "IT Specialist", about: "Digital records and data management.", location: "Dhaka", expertise: "Information Technology" },
  { id: 20, designation: "Education & Research Secretary", name: "Abul Ahad", batch: "12th", institution: "University of Dhaka", jobStatus: "Research Assistant", about: "Academic research and mentorship programs.", location: "Dhaka", expertise: "Academic Research" },
  { id: 21, designation: "Sports Secretary", name: "Md. Mehedi Hasan Emon", batch: "9th", institution: "BKSP", jobStatus: "Sports Coordinator", about: "Sports events and alumni tournaments organizer.", location: "Savar", expertise: "Sports Management" },
  { id: 22, designation: "Office Secretary", name: "Md. Mahbub Alam Palash", batch: "11th", institution: "East West University", jobStatus: "Office Admin", about: "Office management and coordination.", location: "Dhaka", expertise: "Administration" },
  { id: 23, designation: "Executive Member", name: "Md. Naimur Rahman", batch: "9th", institution: "DIU", jobStatus: "Software Programmer", about: "Software development and tech contributor.", location: "Dhaka", expertise: "Programming" },
  { id: 24, designation: "Executive Member", name: "Iftekhar Hossain Emon", batch: "9th", institution: "AUST", jobStatus: "Electrical Engineer", about: "Technical operations and support.", location: "Dhaka", expertise: "Electrical Engineering" },
  { id: 25, designation: "Executive Member", name: "S. M. Rezaul Karim", batch: "9th", institution: "CUET", jobStatus: "Structural Engineer", about: "Engineering alumni liaison.", location: "Chittagong", expertise: "Structural Engineering" },
  { id: 26, designation: "Executive Member", name: "Mehedi Hossain", batch: "9th", institution: "DUET", jobStatus: "Management Consultant", about: "Strategic planning and consulting.", location: "Gazipur", expertise: "Consulting" },
  { id: 27, designation: "Executive Member", name: "Md. Tanvir", batch: "10th", institution: "North South University", jobStatus: "Business Analyst", about: "Business analytics and operations.", location: "Dhaka", expertise: "Business Analysis" },
  { id: 28, designation: "Executive Member", name: "Md. Rabbi", batch: "10th", institution: "IUT", jobStatus: "Industrial Engineer", about: "Industrial engineering and manufacturing.", location: "Gazipur", expertise: "Industrial Engineering" },
  { id: 29, designation: "Executive Member", name: "Abdur Rahman Badshah", batch: "12th", institution: "University of Dhaka", jobStatus: "Graduate Student", about: "Youth engagement and campus outreach.", location: "Dhaka", expertise: "Youth Leadership" },
  { id: 30, designation: "Executive Member", name: "Mohammad Golam Rahman", batch: "12th", institution: "Jagannath University", jobStatus: "High School Teacher", about: "Education and mentoring young alumni.", location: "Dhaka", expertise: "Education" },
  { id: 31, designation: "Executive Member", name: "Shahriar Hasan Tuhin", batch: "12th", institution: "KUET", jobStatus: "Telecom Engineer", about: "Technical initiatives and planning.", location: "Khulna", expertise: "Telecommunications" },
  { id: 32, designation: "Executive Member", name: "Md. Emon Ali", batch: "13th", institution: "Bangladesh University of Professionals", jobStatus: "Undergraduate Student", about: "Newest batch representative and campus coordinator.", location: "Dhaka", expertise: "Student Affairs" },
  { id: 33, designation: "Executive Member", name: "Imran Ahmed Sojib", batch: "13th", institution: "MIST", jobStatus: "Undergraduate Student", about: "Fresh graduate engagement and event planning.", location: "Dhaka", expertise: "Event Management" },
];

export const allMembers: Member[] = [president, ...officers, ...executives];

export const getMemberById = (id: number): Member | undefined =>
  allMembers.find((m) => m.id === id);

export const getInitials = (name: string) => {
  const parts = name.split(" ");
  return parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].substring(0, 2);
};
