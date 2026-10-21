const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Question, Respondent, Answer, Submission } = require('../src/entities');

describe('Entities Unit Tests', () => {
  describe('Question Entity', () => {
    it('should instantiate and serialize properly', () => {
      const q = new Question({
        id: 1,
        section: 'fitur',
        questionText: 'Apa fitur favorit Anda?',
        questionType: 'single_choice',
        options: ['Opsi A', 'Opsi B'],
        orderNo: 1,
        isRequired: true,
      });

      assert.equal(q.id, 1);
      assert.equal(q.section, 'fitur');
      assert.deepEqual(q.options, ['Opsi A', 'Opsi B']);

      const json = q.toJSON();
      assert.equal(json.id, 1);
      assert.equal(json.section, 'fitur');
      assert.equal(json.questionText, 'Apa fitur favorit Anda?');
      assert.equal(json.orderNo, 1);
      assert.equal(json.isRequired, true);
    });

    it('should map from database row with camelCase or snake_case', () => {
      const row = {
        id: 3,
        section: 'tampilan',
        question_text: 'Bagaimana tampilan?',
        question_type: 'rating_1_5',
        options: null,
        order_no: 3,
        is_required: true,
      };

      const q = Question.fromDatabase(row);
      assert.equal(q.id, 3);
      assert.equal(q.questionText, 'Bagaimana tampilan?');
      assert.equal(q.questionType, 'rating_1_5');
      assert.equal(q.orderNo, 3);
    });
  });

  describe('Respondent Entity', () => {
    it('should create respondent and serialize', () => {
      const resp = Respondent.fromPayload({
        fullName: 'Ahmad Dahlan',
        phoneNumber: '081234567890',
        ageRange: '25 - 35 tahun',
        targetHajjYear: 2030,
      });

      assert.equal(resp.fullName, 'Ahmad Dahlan');
      assert.equal(resp.phoneNumber, '081234567890');
      assert.equal(resp.targetHajjYear, 2030);

      const json = resp.toJSON();
      assert.equal(json.fullName, 'Ahmad Dahlan');
      assert.equal(json.targetHajjYear, 2030);
    });
  });

  describe('Answer Entity', () => {
    it('should create answer from payload and stringify objects', () => {
      const ansObj = Answer.fromPayload('FB-202610-123456', {
        questionId: 2,
        answer: { detail: 'pilihan' },
      });

      assert.equal(ansObj.submissionId, 'FB-202610-123456');
      assert.equal(ansObj.questionId, 2);
      assert.equal(ansObj.answerValue, JSON.stringify({ detail: 'pilihan' }));
    });

    it('should map from database row', () => {
      const row = {
        id: 10,
        submission_id: 'FB-202610-ABCDEF',
        question_id: 5,
        answer_value: '5',
        question_text: 'Kepuasan warna?',
        section: 'tampilan',
      };

      const ans = Answer.fromDatabase(row);
      assert.equal(ans.id, 10);
      assert.equal(ans.submissionId, 'FB-202610-ABCDEF');
      assert.equal(ans.answerValue, '5');
      assert.equal(ans.questionText, 'Kepuasan warna?');
    });
  });

  describe('Submission Entity', () => {
    it('should assemble full submission with respondent and answers', () => {
      const sub = Submission.create({
        id: 'FB-202610-A9F82C',
        respondent: {
          fullName: 'Siti Aminah',
          phoneNumber: '081987654321',
          ageRange: '36 - 45 tahun',
          targetHajjYear: 2028,
        },
        clientInfo: {
          userAgent: 'Mozilla/5.0 Test',
          ipAddress: '127.0.0.1',
        },
        answers: [
          { questionId: 1, answer: 'Opsi A' },
          { questionId: 3, answer: '5' },
        ],
      });

      assert.equal(sub.id, 'FB-202610-A9F82C');
      assert.equal(sub.fullName, 'Siti Aminah');
      assert.equal(sub.phoneNumber, '081987654321');
      assert.equal(sub.answers.length, 2);
      assert.equal(sub.userAgent, 'Mozilla/5.0 Test');
      assert.equal(sub.ipAddress, '127.0.0.1');

      const json = sub.toJSON();
      assert.equal(json.submissionId, 'FB-202610-A9F82C');
      assert.equal(json.fullName, 'Siti Aminah');
      assert.equal(json.answers.length, 2);
    });
  });
});
