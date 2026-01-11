
export enum Priority {
  Low = 1,
  Medium = 2,
  High = 3,
}

export const priorityLabel = {
    [Priority.Low]: 'Low',
    [Priority.Medium]: 'Medium',
    [Priority.High]: 'High'
}

export enum Status {
  NotStarted = 'Not Started',
  InProgress = 'In Progress',
  Completed = 'Completed',
}
   