/** Full years between `birthDate` and `referenceDate`, birthday not yet
 *  reached this year counted out. Pure, so the API and the registration form
 *  apply the same rule. */
export const calculateAge = (birthDate: Date, referenceDate: Date = new Date()): number => {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();

  const hasNotHadBirthdayYet =
    referenceDate.getMonth() < birthDate.getMonth() ||
    (referenceDate.getMonth() === birthDate.getMonth() &&
      referenceDate.getDate() < birthDate.getDate());

  if (hasNotHadBirthdayYet) age -= 1;

  return age;
};
