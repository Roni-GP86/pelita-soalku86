export interface SchoolInfo {
  schoolName: string;
  schoolAddress: string;
  principalName: string;
  principalNip: string;
  teacherName: string;
  teacherNip: string;
  gradeClass: string;
  academicYear: string;
  logoType?: "tutwuri" | "custom" | "none";
  logoCustomData?: string;
  semester?: "I" | "II";
  teacherTitle?: string;
  phase?: "Fase A" | "Fase B" | "Fase C";
  governmentName?: string;
  educationDepartment?: string;
  documentPlace?: string;
  documentDate?: string;
  assessmentPurpose?: string;
}

export type SubjectType =
  | "Pendidikan Agama Islam"
  | "Pendidikan Agama Kristen"
  | "Pendidikan Agama Katolik"
  | "Pendidikan Agama Hindu"
  | "Pendidikan Agama Buddha"
  | "Pendidikan Agama Khonghucu"
  | "Pendidikan Pancasila"
  | "Bahasa Indonesia"
  | "Matematika"
  | "IPAS"
  | "Bahasa Inggris"
  | "PJOK"
  | "Seni Rupa"
  | "Seni Tari"
  | "Seni Musik";

export interface AITopic {
  name: string;
  materi: string[];
}

export interface AIElementTopic {
  cp: string;
  element: string;
  topics: AITopic[];
}

export interface QuestionConfig {
  type: "Pilihan Ganda" | "Isian Singkat" | "Uraian";
  count: number;
  cognitiveLevel: "Level 1" | "Level 2" | "Level 3";
}

export interface KisiKisiRow {
  number: number;
  cp: string;
  element: string;
  materi: string;
  indicator: string;
  cognitiveLevel: string;
  questionType: string;
  answerKey: string;
  originalIndicator?: string;
}

export interface QuestionItem {
  number: number;
  questionType: "Pilihan Ganda" | "Isian Singkat" | "Uraian";
  cognitiveLevel: string;
  materi: string;
  stimulusText?: string;
  questionText: string;
  options?: string[];
  answerKey: string;
  explanation: string;
  imageUrl?: string;
  svgContent?: string;
  imagenPrompt?: string;
  imagePrompt?: string;
  alternativeAnswers?: string[];
  imageWidth?: number;
  imageHeight?: number;
}
