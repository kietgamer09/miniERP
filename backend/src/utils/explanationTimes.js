export function explanationTimes(body) {
  const data = {
    requested_check_in: body.requested_check_in === undefined ? '07:59' : body.requested_check_in,
    requested_check_out: body.requested_check_out === undefined ? '17:01' : body.requested_check_out,
  };
  for (const value of Object.values(data)) {
    if (value !== null && (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))) {
      return { error: 'Giờ đề nghị phải có định dạng HH:mm (00:00–23:59).' };
    }
  }
  if (!data.requested_check_in && !data.requested_check_out) return { error: 'Chọn ít nhất giờ vào hoặc giờ ra đề nghị.' };
  if (data.requested_check_in && data.requested_check_out && data.requested_check_out <= data.requested_check_in) {
    return { error: 'Giờ ra đề nghị phải sau giờ vào trong cùng ngày.' };
  }
  return { data };
}
