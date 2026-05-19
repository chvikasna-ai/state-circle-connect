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
const answersKey = (questionId: string) => `state-circle-local-answers-${questionId}`;

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

export const getLocalQuestions = (): LocalQuestion[] => {
  if (!canUseStorage()) return [];
  const saved = window.localStorage.getItem(QUESTIONS_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved) as LocalQuestion[];
  } catch {
    window.localStorage.removeItem(QUESTIONS_KEY);
    return [];
  }
};

export const saveLocalQuestion = (question: Omit<LocalQuestion, "id" | "created_at">) => {
  const questions = getLocalQuestions();
  const nextQuestion: LocalQuestion = {
    ...question,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  window.localStorage.setItem(QUESTIONS_KEY, JSON.stringify([nextQuestion, ...questions]));
  return nextQuestion;
};

export const findLocalQuestion = (id: string) => getLocalQuestions().find(question => question.id === id) ?? null;

export const getLocalAnswers = (questionId: string): LocalAnswer[] => {
  if (!canUseStorage()) return [];
  const saved = window.localStorage.getItem(answersKey(questionId));
  if (!saved) return [];
  try {
    return JSON.parse(saved) as LocalAnswer[];
  } catch {
    window.localStorage.removeItem(answersKey(questionId));
    return [];
  }
};

export const saveLocalAnswer = (answer: Omit<LocalAnswer, "id" | "created_at">) => {
  const answers = getLocalAnswers(answer.question_id);
  const nextAnswer: LocalAnswer = {
    ...answer,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  window.localStorage.setItem(answersKey(answer.question_id), JSON.stringify([...answers, nextAnswer]));
  return nextAnswer;
};
