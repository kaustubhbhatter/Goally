
import { Priority, Status } from './constants';

export interface Initiative {
  id: string;
  description: string;
  priority: Priority;
  status: Status;
  dueDate?: string;
}

export interface KR {
  id: string;
  description:string;
  weightage: number;
  initiatives: Initiative[];
}

export interface Goal {
  id: string;
  title: string;
  krs: KR[];
}