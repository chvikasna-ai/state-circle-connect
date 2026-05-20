export type LocalQuestion = {
  id: string;
  user_id: string;
  state_code: string;
  title: string;
  body: string | null;
  created_at: string;
};

export type LocalAnswer = {
  id: string;
  question_id: string;
  user_id: string;
  state_code: string;
  body: string;
  created_at: string;
  display_name: string;
};

const QUESTIONS_KEY = "state-circle-local-questions";
const stateQuestionsKey = (stateCode: string) => `state-circle-local-questions-${stateCode}`;
const answersKey = (stateCode: string, questionId: string) => `state-circle-local-answers-${stateCode}-${questionId}`;

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

const readQuestions = (key: string): LocalQuestion[] => {
  if (!canUseStorage()) return [];
  const saved = window.localStorage.getItem(key);
  if (!saved) return [];
  try {
    return JSON.parse(saved) as LocalQuestion[];
  } catch {
    window.localStorage.removeItem(key);
    return [];
  }
};

export const getLocalQuestions = (stateCode?: string): LocalQuestion[] => {
  if (!stateCode) return [];
  const savedQuestions = readQuestions(stateQuestionsKey(stateCode));
  const legacyQuestions = readQuestions(QUESTIONS_KEY).filter(question => question.state_code === stateCode);
  const savedIds = new Set(savedQuestions.map(question => question.id));
  return [...savedQuestions, ...legacyQuestions.filter(question => !savedIds.has(question.id))]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
};

export const saveLocalQuestion = (question: Omit<LocalQuestion, "id" | "created_at">) => {
  const questions = readQuestions(stateQuestionsKey(question.state_code));
  const nextQuestion: LocalQuestion = {
    ...question,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  window.localStorage.setItem(stateQuestionsKey(question.state_code), JSON.stringify([nextQuestion, ...questions]));
  return nextQuestion;
};

export const findLocalQuestion = (id: string, stateCode?: string) =>
  getLocalQuestions(stateCode).find(question => question.id === id) ?? null;

export const getLocalAnswers = (stateCode: string, questionId: string): LocalAnswer[] => {
  if (!canUseStorage()) return [];
  const saved = window.localStorage.getItem(answersKey(stateCode, questionId));
  if (!saved) return [];
  try {
    return JSON.parse(saved) as LocalAnswer[];
  } catch {
    window.localStorage.removeItem(answersKey(stateCode, questionId));
    return [];
  }
};

export const saveLocalAnswer = (answer: Omit<LocalAnswer, "id" | "created_at">) => {
  const answers = getLocalAnswers(answer.state_code, answer.question_id);
  const nextAnswer: LocalAnswer = {
    ...answer,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  window.localStorage.setItem(answersKey(answer.state_code, answer.question_id), JSON.stringify([...answers, nextAnswer]));
  return nextAnswer;
};
