export const calculateAge = (birthDate: Date, referenceDate: Date = new Date()): number => {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();

  const hasNotHadBirthdayYet =
    referenceDate.getMonth() < birthDate.getMonth() ||
    (referenceDate.getMonth() === birthDate.getMonth() &&
      referenceDate.getDate() < birthDate.getDate());

  if (hasNotHadBirthdayYet) {
    age -= 1;
  }

  return age;
};