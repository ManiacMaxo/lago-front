import { forwardRef, useRef, useState, useImperativeHandle } from 'react'
import { gql } from '@apollo/client'

import { DialogRef } from '~/components/designSystem'
import { useInternationalization } from '~/hooks/core/useInternationalization'
import { addToast } from '~/core/apolloClient'
import {
  CustomerDetailsFragment,
  CustomerDetailsFragmentDoc,
  useTerminateCustomerSubscriptionMutation,
} from '~/generated/graphql'
import { WarningDialog } from '~/components/WarningDialog'

gql`
  mutation terminateCustomerSubscription($input: TerminateSubscriptionInput!) {
    terminateSubscription(input: $input) {
      id
      customer {
        id
        activeSubscriptionCount
      }
    }
  }
`

export interface TerminateCustomerSubscriptionDialogRef {
  openDialog: (subscriptionInfos: { id: string; name?: string | null }) => unknown
  closeDialog: () => unknown
}

export const TerminateCustomerSubscriptionDialog =
  forwardRef<TerminateCustomerSubscriptionDialogRef>((_, ref) => {
    const dialogRef = useRef<DialogRef>(null)
    const [terminate] = useTerminateCustomerSubscriptionMutation({
      onCompleted({ terminateSubscription }) {
        if (!!terminateSubscription) {
          addToast({
            severity: 'success',
            translateKey: 'text_62d953aa13c166a6a24cbaf4',
          })
        }
      },
      update(cache, { data }) {
        if (!data?.terminateSubscription) return

        const cacheId = cache.identify({
          id: data?.terminateSubscription.id,
          __typename: 'Subscription',
        })

        cache.evict({ id: cacheId })

        const cachedCustomerId = `Customer:${data.terminateSubscription.customer.id}`

        const previousData: CustomerDetailsFragment | null = cache.readFragment({
          id: cachedCustomerId,
          fragment: CustomerDetailsFragmentDoc,
          fragmentName: 'CustomerDetails',
        })

        cache.writeFragment({
          id: cachedCustomerId,
          fragment: CustomerDetailsFragmentDoc,
          fragmentName: 'CustomerDetails',
          data: {
            ...previousData,
            activeSubscriptionCount: data.terminateSubscription.customer.activeSubscriptionCount,
          },
        })
      },
    })
    const [subscription, setSubscription] = useState<
      { id: string; name?: string | null } | undefined
    >(undefined)
    const { translate } = useInternationalization()

    useImperativeHandle(ref, () => ({
      openDialog: (infos) => {
        setSubscription(infos)
        dialogRef.current?.openDialog()
      },
      closeDialog: () => dialogRef.current?.closeDialog(),
    }))

    return (
      <WarningDialog
        ref={dialogRef}
        title={translate('text_62d7f6178ec94cd09370e2f3')}
        description={translate('text_62d7f6178ec94cd09370e313', {
          subscriptionName: subscription?.name,
        })}
        onContinue={async () =>
          await terminate({
            variables: { input: { id: subscription?.id as string } },
            refetchQueries: ['getCustomerSubscriptionForList'],
          })
        }
        continueText={translate('text_62d7f6178ec94cd09370e351')}
      />
    )
  })

TerminateCustomerSubscriptionDialog.displayName = 'TerminateCustomerSubscriptionDialog'
