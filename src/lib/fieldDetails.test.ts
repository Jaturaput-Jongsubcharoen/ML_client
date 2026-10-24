import { describe, expect, it } from 'vitest';
import { getFieldDetail } from './data/fieldDetails';
import { featureOptions } from './data/features';

describe('input field details', () => {
	it('provides an explanation for every supported categorical value', () => {
		for (const [field, options] of Object.entries(featureOptions)) {
			for (const option of options) {
				const detail = getFieldDetail(field as keyof typeof featureOptions, option);
				expect(detail.description.trim()).not.toBe('');
				expect(detail.meaning.trim()).not.toBe('');
				expect(detail.meaning).not.toContain('Recorded ');
			}
		}
	});

	it('explains coordinate axes and reports out-of-range values', () => {
		expect(getFieldDetail('latitude', '43.7').meaning).toBe('43.7° on the north-south axis.');
		expect(getFieldDetail('longitude', '-79.4').meaning).toBe('-79.4° on the east-west axis.');
		expect(getFieldDetail('latitude', '91').meaning).toContain('-90 to 90');
	});
});
