import { _config, i18n, fullName, birthDate, phone } from '@ecomplus/utils'
import InputDocNumber from './../_internal/InputDocNumber.vue'
import InputPhone from './../_internal/InputPhone.vue'
import InputDate from './../_internal/InputDate.vue'
import cloneDeep from 'lodash.clonedeep'

import {
  Birthdate,
  Cellphone,
  CompanyRegistration,
  ContactPhone,
  DocNumber,
  EmailAddress,
  Female,
  FullName,
  GenderX,
  Male,
  Nickname,
  PersonalRegistration,
  Save
} from './../../lib/i18n'

const countryCode = _config.get('country_code')

export default {
  name: 'EcAccountForm',

  components: {
    InputDocNumber,
    InputPhone,
    InputDate
  },

  props: {
    mergeDictionary: {
      type: Object,
      default: () => {}
    },
    short: {
      type: Boolean
    },
    customer: {
      type: Object,
      required: true
    }
  },

  data () {
    return {
      localCustomer: cloneDeep(this.customer),
      fullName: fullName(this.customer)
    }
  },

  computed: {
    dictionary () {
      return {
        Birthdate,
        Cellphone,
        CompanyRegistration,
        ContactPhone,
        DocNumber,
        EmailAddress,
        Female,
        FullName,
        GenderX,
        Male,
        Nickname,
        PersonalRegistration,
        Save,
        ...this.mergeDictionary
      }
    },

    birthdate: {
      get () {
        return birthDate(this.customer)
      },
      set (dateStr) {
        const dateNumber = (start, ln) => parseInt(dateStr.substr(start, ln), 10)
        let day, month, year
        if (countryCode === 'BR') {
          day = dateNumber(0, 2)
          month = dateNumber(2, 2)
          year = dateNumber(4, 4)
        } else {
          day = dateNumber(6, 2)
          month = dateNumber(4, 2)
          year = dateNumber(0, 4)
        }
        this.localCustomer.birth_date = { day, month, year }
      }
    },

    phoneNumber: {
      get () {
        return this.getPhoneStr(0)
      },
      set (phoneStr) {
        this.localCustomer.phones[0] = this.parsePhoneStr(phoneStr)
      }
    },

    secondPhoneNumber: {
      get () {
        return this.getPhoneStr(1)
      },
      set (phoneStr) {
        const { phones } = this.localCustomer
        phones[phones.length > 0 ? 1 : 0] = this.parsePhoneStr(phoneStr)
      }
    }
  },

  methods: {
    i18n (label) {
      return i18n(this.dictionary[label])
    },

    getPhoneStr (index = 0) {
      const { phones } = this.customer
      return phones[index]
        ? phone(this.customer.phones[index])
        : ''
    },

    parsePhoneStr (phoneStr) {
      let code, number
      if (phoneStr.charAt(0) === '+') {
        code = phoneStr.substr(1, 2)
        number = phoneStr.substr(3)
      } else {
        number = phoneStr
      }
      const phoneObj = { number }
      if (code) {
        phoneObj.country_code = code
      }
      return phoneObj
    },

    submit (ev) {
      const $form = this.$el
      if ($form.checkValidity()) {
        this.$emit('update:customer', this.localCustomer)
      }
      $form.classList.add('was-validated')
    }
  },

  watch: {
    fullName (nameStr) {
      const names = nameStr.split(' ')
      this.localCustomer.name = {
        given_name: names.shift()
      }
      const { name } = this.localCustomer
      if (names.length) {
        name.family_name = names.pop()
        if (names.length) {
          name.middle_name = names.join(' ')
        }
      }
    }
  },

  mounted () {
    const $inputs = this.$el.querySelectorAll('input')
    for (let i = 0; i < $inputs.length; i++) {
      if (!$inputs[i].value) {
        $inputs[i].focus()
        break
      }
    }
  }
}
