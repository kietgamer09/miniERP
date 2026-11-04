describe('Kiểm tra các rule nghiệp vụ chấm công (Unit Test)', () => {

  test('Kiểm tra logic nhận diện ngày trong tương lai', () => {
    const isFutureDate = (dateStr) => new Date(dateStr) > new Date('2026-11-04');
    expect(isFutureDate('2030-01-01')).toBe(true);
  });

  test('Kiểm tra điều kiện record thiếu check-out', () => {
    const record = { check_in: '08:00:00', check_out: null };
    const isValidComplete = record.check_in && record.check_out;
    expect(isValidComplete).toBeFalsy();
  });

});