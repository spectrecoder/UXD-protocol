import type { PublicKey } from '@solana/web3.js';
import { formatDistanceToNowStrict } from 'date-fns';
import { pipe } from 'fp-ts/lib/function';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { RealmIcon } from '@hub/components/RealmIcon';
import { RichTextDocumentDisplay } from '@hub/components/RichTextDocumentDisplay';
import { useQuery } from '@hub/hooks/useQuery';
import cx from '@hub/lib/cx';
import * as RE from '@hub/types/Result';

import * as gql from './gql';

interface Props {
  className?: string;
  postId: string;
  realm: PublicKey;
}

export function Post(props: Props) {
  const [result] = useQuery(gql.getPostResp, {
    query: gql.getPost,
    variables: {
      id: props.postId,
      realm: props.realm.toBase58(),
    },
  });

  const router = useRouter();

  return pipe(
    result,
    RE.match(
      () => (
        <div
          className={cx(
            'bg-neutral-200',
            'h-8',
            'rounded',
            'w-full',
            props.className,
          )}
        />
      ),
      () => (
        <div
          className={cx(
            'animate-pulse',
            'bg-neutral-200',
            'h-8',
            'rounded',
            'w-full',
            props.className,
          )}
        />
      ),
      ({ feedItem }) => (
        <button
          className={cx(
            'text-left',
            'w-full',
            'overflow-hidden',
            props.className,
          )}
          onClick={() => {
            router.push(`/realm/${feedItem.realm.urlId}/${props.postId}`);
          }}
        >
          <Link
            passHref
            href={`/realm/${feedItem.realm.urlId}/${props.postId}`}
          >
            <a
              className={cx(
                'block',
                'font-bold',
                'text-neutral-900',
                'transition-colors',
                'truncate',
                'hover:text-sky-500',
              )}
            >
              {feedItem.title}
            </a>
          </Link>
          <RichTextDocumentDisplay
            className="text-sm text-neutral-500"
            document={feedItem.clippedDocument.document}
            isClipped={feedItem.clippedDocument.isClipped}
          />
          <div className="flex items-center mt-1.5">
            <RealmIcon
              className="h-4 mr-1 w-4"
              iconUrl={feedItem.realm.iconUrl}
              name={feedItem.realm.name}
            />
            <div className="text-xs font-medium text-neutral-900">
              {feedItem.realm.name}
            </div>
            <div className="text-xs text-neutral-500 ml-3">
              {formatDistanceToNowStrict(feedItem.created)} ago
            </div>
          </div>
        </button>
      ),
    ),
  );
}
