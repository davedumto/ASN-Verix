export function validateTaskDescription(description: string): {
  valid: boolean;
  error?: string;
} {
  if (!description || description.trim().length === 0) {
    return { valid: false, error: "Task description is required" };
  }

  if (description.trim().length < 10) {
    return {
      valid: false,
      error: "Task description must be at least 10 characters",
    };
  }

  if (description.length > 5000) {
    return {
      valid: false,
      error: "Task description must be under 5000 characters",
    };
  }

  return { valid: true };
}

export function validateRating(rating: number): {
  valid: boolean;
  error?: string;
} {
  if (typeof rating !== "number" || isNaN(rating)) {
    return { valid: false, error: "Rating must be a number" };
  }

  if (rating < 0 || rating > 100) {
    return { valid: false, error: "Rating must be between 0 and 100" };
  }

  return { valid: true };
}
